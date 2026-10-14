const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const path = require('path');

const getVendorProfileImagePath = (imageUrl, userId) => {
  if (typeof imageUrl !== 'string') return null;

  const pathname = new URL(imageUrl, 'http://localhost').pathname;
  const filename = path.basename(pathname);
  const profilesDirectory = path.resolve(__dirname, '../../uploads/profiles');
  const imagePath = path.resolve(profilesDirectory, filename);
  if (!pathname.startsWith('/uploads/profiles/') ||
      !filename.startsWith(`vendor-${userId}-`) ||
      path.dirname(imagePath) !== profilesDirectory) {
    return null;
  }
  return imagePath;
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizerProfile: true,
        vendorProfile: {
          include: { category: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not return password
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true }
    });

    if (!user || !user.organizerProfile) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }

    const updatedProfile = await prisma.organizerProfile.update({
      where: { id: user.organizerProfile.id },
      data: {
        firstName: firstName !== undefined ? firstName : user.organizerProfile.firstName,
        lastName: lastName !== undefined ? lastName : user.organizerProfile.lastName,
        phone: phone !== undefined ? phone : user.organizerProfile.phone,
      }
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmation } = req.body || {};

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'Type DELETE to confirm account deletion.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Your current password is required.' });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'VENDOR', isActive: true },
      include: { vendorProfile: true }
    });
    if (!user || !user.vendorProfile) {
      return res.status(404).json({ message: 'Vendor account not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findFirst({
        where: { id: userId, role: 'VENDOR', isActive: true },
        select: { id: true }
      });
      const vendor = await tx.vendorProfile.findUnique({
        where: { userId },
        select: { id: true, imageUrl: true }
      });
      if (!currentUser || !vendor) {
        const error = new Error('Vendor account not found.');
        error.status = 404;
        throw error;
      }

      const quotes = await tx.quote.findMany({
        where: { vendorId: vendor.id },
        select: { id: true }
      });
      const quoteIds = quotes.map((quote) => quote.id);
      const [
        inquiryCount,
        bookingCount,
        reviewCount,
        shortlistCount,
        messageCount
      ] = await Promise.all([
        tx.vendorInquiry.count({ where: { vendorId: vendor.id } }),
        quoteIds.length
          ? tx.booking.count({ where: { quoteId: { in: quoteIds } } })
          : Promise.resolve(0),
        tx.review.count({ where: { vendorId: vendor.id } }),
        tx.shortlist.count({ where: { vendorId: vendor.id } }),
        tx.message.count({
          where: { OR: [{ senderId: userId }, { receiverId: userId }] }
        })
      ]);

      const blockers = [];
      if (bookingCount) blockers.push(`${bookingCount} booking(s)`);
      if (inquiryCount) blockers.push(`${inquiryCount} event inquiry/inquiries`);
      if (quotes.length) blockers.push(`${quotes.length} quote(s)`);
      if (reviewCount) blockers.push(`${reviewCount} review(s)`);
      if (shortlistCount) blockers.push(`${shortlistCount} organizer shortlist(s)`);
      if (messageCount) blockers.push(`${messageCount} message(s)`);

      if (blockers.length) {
        return { blocked: blockers };
      }

      await tx.vendorService.deleteMany({ where: { vendorId: vendor.id } });
      await tx.vendorPackage.deleteMany({ where: { vendorId: vendor.id } });
      await tx.vendorAvailability.deleteMany({ where: { vendorId: vendor.id } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.vendorProfile.delete({ where: { id: vendor.id } });
      await tx.user.delete({ where: { id: userId } });

      return { deleted: true, imagePath: getVendorProfileImagePath(vendor.imageUrl, userId) };
    }, { isolationLevel: 'Serializable' });

    if (result.blocked) {
      return res.status(409).json({
        code: 'ACCOUNT_DEACTIVATION_REQUIRED',
        message: `This account has ${result.blocked.join(', ')} that must be preserved. Deactivate the account instead to prevent access while retaining this history.`
      });
    }

    if (result.imagePath) {
      try {
        await fs.unlink(result.imagePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('[Vendor Profile Image Cleanup Error]', error);
          return res.json({
            message: 'Vendor account deleted, but its uploaded profile image could not be removed.'
          });
        }
      }
    }

    return res.json({ message: 'Vendor account deleted successfully.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === 'P2034') {
      return res.status(409).json({
        message: 'Account data changed during deletion. Please try again.'
      });
    }
    console.error('[Delete Vendor Account Error]', error);
    return res.status(500).json({
      message: 'Unable to delete the vendor account. No account data was removed.'
    });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmation } = req.body || {};

    if (confirmation !== 'DEACTIVATE') {
      return res.status(400).json({ message: 'Type DEACTIVATE to confirm account deactivation.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Your current password is required.' });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'VENDOR', isActive: true }
    });
    if (!user) {
      return res.status(404).json({ message: 'Vendor account not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, role: 'VENDOR', isActive: true },
      data: { isActive: false }
    });
    if (result.count !== 1) {
      return res.status(409).json({ message: 'This vendor account is already deactivated.' });
    }

    return res.json({
      message: 'Vendor account deactivated. Your profile and business history have been preserved.'
    });
  } catch (error) {
    console.error('[Deactivate Vendor Account Error]', error);
    return res.status(500).json({ message: 'Unable to deactivate the vendor account.' });
  }
};

const updateVendorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      businessName,
      description,
      phone,
      website,
      categoryId,
      imageUrl,
      address,
      city,
      state,
      postalCode
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true }
    });

    if (!user || !user.vendorProfile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    const dataToUpdate = {};
    if (businessName !== undefined) dataToUpdate.businessName = businessName;
    if (description !== undefined) dataToUpdate.description = description;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (website !== undefined) dataToUpdate.website = website;
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId || null;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl || null;
    if (address !== undefined) dataToUpdate.address = address || null;
    if (city !== undefined) dataToUpdate.city = city || null;
    if (state !== undefined) dataToUpdate.state = state || null;
    if (postalCode !== undefined) dataToUpdate.postalCode = postalCode || null;

    const updatedProfile = await prisma.vendorProfile.update({
      where: { id: user.vendorProfile.id },
      data: dataToUpdate,
      include: { category: true }
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating vendor profile' });
  }
};

const uploadVendorImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true }
    });

    if (!user || !user.vendorProfile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/profiles/${req.file.filename}`;

    const updatedProfile = await prisma.vendorProfile.update({
      where: { id: user.vendorProfile.id },
      data: { imageUrl },
      include: { category: true }
    });

    res.json({
      message: 'Profile image uploaded successfully',
      imageUrl,
      vendorProfile: updatedProfile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading profile image' });
  }
};

const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    // upsert: if the user never saved preferences, return the defaults
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: {
          userId,
          eventUpdates: true,
          vendorActivity: true,
          quotesAndBookings: true,
          generalSystem: true
        }
      });
    }

    res.json(prefs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching notification preferences' });
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventUpdates, vendorActivity, quotesAndBookings, generalSystem } = req.body;

    // Validate — only accept explicit booleans
    const data = {};
    if (typeof eventUpdates === 'boolean') data.eventUpdates = eventUpdates;
    if (typeof vendorActivity === 'boolean') data.vendorActivity = vendorActivity;
    if (typeof quotesAndBookings === 'boolean') data.quotesAndBookings = quotesAndBookings;
    if (typeof generalSystem === 'boolean') data.generalSystem = generalSystem;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid preference values provided' });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        eventUpdates: data.eventUpdates ?? true,
        vendorActivity: data.vendorActivity ?? true,
        quotesAndBookings: data.quotesAndBookings ?? true,
        generalSystem: data.generalSystem ?? true
      }
    });

    res.json(prefs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating notification preferences' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateVendorProfile,
  uploadVendorImage,
  updatePassword,
  deleteAccount,
  deactivateAccount,
  getNotificationPreferences,
  updateNotificationPreferences
};
