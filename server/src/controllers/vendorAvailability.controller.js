const prisma = require('../utils/prisma');

// Helper to normalize date to UTC midnight
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

const getAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    // 1. Fetch vendor-configured availability & blocked dates
    const availability = await prisma.vendorAvailability.findMany({
      where: { vendorId: vendor.id },
      orderBy: { date: 'asc' }
    });

    // 2. Fetch existing confirmed/completed bookings for this vendor
    const vendorQuotes = await prisma.quote.findMany({
      where: { vendorId: vendor.id },
      select: { id: true }
    });
    const quoteIds = vendorQuotes.map(q => q.id);

    const bookings = await prisma.booking.findMany({
      where: {
        quoteId: { in: quoteIds },
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      availability,
      bookings: bookings.map(b => ({
        id: b.id,
        status: b.status,
        event: b.event
      }))
    });
  } catch (error) {
    console.error('[Availability Fetch Error]', error);
    res.status(500).json({ message: 'Error fetching availability' });
  }
};

const createOrUpdateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, isBlocked, startTime, endTime, reason } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Time range validation
    if (startTime && endTime && startTime > endTime) {
      return res.status(400).json({ message: 'End time cannot be earlier than start time' });
    }

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const targetDate = normalizeDate(date);

    // Check if there is already a confirmed booking on this date
    const vendorQuotes = await prisma.quote.findMany({
      where: { vendorId: vendor.id },
      select: { id: true }
    });
    const quoteIds = vendorQuotes.map(q => q.id);

    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        quoteId: { in: quoteIds },
        status: 'CONFIRMED',
        event: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      },
      include: { event: true }
    });

    // Check if entry already exists for this date
    const existingEntry = await prisma.vendorAvailability.findFirst({
      where: {
        vendorId: vendor.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    let result;
    if (existingEntry) {
      // Update existing entry
      result = await prisma.vendorAvailability.update({
        where: { id: existingEntry.id },
        data: {
          isBlocked: isBlocked !== undefined ? Boolean(isBlocked) : existingEntry.isBlocked,
          startTime: startTime !== undefined ? (startTime || null) : existingEntry.startTime,
          endTime: endTime !== undefined ? (endTime || null) : existingEntry.endTime,
          reason: reason !== undefined ? (reason ? reason.trim() : null) : existingEntry.reason
        }
      });
    } else {
      // Create new entry
      result = await prisma.vendorAvailability.create({
        data: {
          vendorId: vendor.id,
          date: targetDate,
          isBlocked: isBlocked !== undefined ? Boolean(isBlocked) : false,
          startTime: startTime || null,
          endTime: endTime || null,
          reason: reason ? reason.trim() : null
        }
      });
    }

    res.status(existingEntry ? 200 : 201).json({
      entry: result,
      hasBookingConflict: Boolean(conflictingBooking),
      booking: conflictingBooking ? {
        id: conflictingBooking.id,
        eventTitle: conflictingBooking.event.title
      } : null
    });
  } catch (error) {
    console.error('[Availability Save Error]', error);
    res.status(500).json({ message: 'Error saving availability' });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { isBlocked, startTime, endTime, reason } = req.body;

    // Time validation
    if (startTime && endTime && startTime > endTime) {
      return res.status(400).json({ message: 'End time cannot be earlier than start time' });
    }

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingEntry = await prisma.vendorAvailability.findFirst({
      where: { id, vendorId: vendor.id }
    });

    if (!existingEntry) {
      return res.status(404).json({ message: 'Availability entry not found or unauthorized' });
    }

    const updated = await prisma.vendorAvailability.update({
      where: { id },
      data: {
        isBlocked: isBlocked !== undefined ? Boolean(isBlocked) : existingEntry.isBlocked,
        startTime: startTime !== undefined ? (startTime || null) : existingEntry.startTime,
        endTime: endTime !== undefined ? (endTime || null) : existingEntry.endTime,
        reason: reason !== undefined ? (reason ? reason.trim() : null) : existingEntry.reason
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('[Availability Update Error]', error);
    res.status(500).json({ message: 'Error updating availability' });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingEntry = await prisma.vendorAvailability.findFirst({
      where: { id, vendorId: vendor.id }
    });

    if (!existingEntry) {
      return res.status(404).json({ message: 'Availability entry not found or unauthorized' });
    }

    await prisma.vendorAvailability.delete({ where: { id } });

    res.json({ message: 'Availability entry deleted successfully' });
  } catch (error) {
    console.error('[Availability Delete Error]', error);
    res.status(500).json({ message: 'Error deleting availability' });
  }
};

module.exports = {
  getAvailability,
  createOrUpdateAvailability,
  updateAvailability,
  deleteAvailability
};
