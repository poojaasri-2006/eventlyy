const prisma = require('../utils/prisma');
const { createNotification } = require('../utils/createNotification');

const getInquiries = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const inquiries = await prisma.vendorInquiry.findMany({
      where: {
        event: {
          organizerId: organizer.id
        }
      },
      include: {
        vendor: true,
        event: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(inquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching inquiries' });
  }
};

const createInquiry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, vendorId, message } = req.body;

    if (!eventId || !vendorId) {
      return res.status(400).json({ message: 'Event ID and Vendor ID are required.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Inquiry message or details are required.' });
    }

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: organizer.id }
    });
    if (!event) return res.status(403).json({ message: 'Event not found or unauthorized' });

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId }
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check if a pending inquiry already exists for this event and vendor
    const existingInquiry = await prisma.vendorInquiry.findFirst({
      where: {
        eventId,
        vendorId,
        status: 'PENDING'
      }
    });

    if (existingInquiry) {
      return res.status(409).json({
        message: 'A pending inquiry has already been submitted to this vendor for this event.',
        inquiry: existingInquiry
      });
    }

    const inquiry = await prisma.vendorInquiry.create({
      data: {
        eventId,
        vendorId,
        message
      }
    });

    // Notify the organizer that their inquiry was sent
    await createNotification({
      userId,
      type: 'GENERAL',
      title: 'Inquiry Sent',
      content: `Your inquiry for event "${event.title}" has been sent to the vendor.`,
      eventId,
      inquiryId: inquiry.id
    });

    // Notify the vendor's user account that they received an inquiry
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { user: true }
    });
    if (vendorProfile) {
      await createNotification({
        userId: vendorProfile.userId,
        type: 'INQUIRY_RESPONSE',
        title: 'New Inquiry Received',
        content: `You have received a new inquiry for event "${event.title}".`,
        eventId,
        inquiryId: inquiry.id
      });
    }

    res.status(201).json(inquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating inquiry' });
  }
};

const cancelInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const inquiry = await prisma.vendorInquiry.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });
    if (inquiry.event.organizerId !== organizer.id) return res.status(403).json({ message: 'Forbidden' });
    
    if (inquiry.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending inquiries can be cancelled' });
    }

    const updated = await prisma.vendorInquiry.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error cancelling inquiry' });
  }
};

module.exports = { getInquiries, createInquiry, cancelInquiry };
