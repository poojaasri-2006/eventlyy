const prisma = require('../utils/prisma');
const { createNotification } = require('../utils/createNotification');

const getVendorRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const requests = await prisma.vendorInquiry.findMany({
      where: { vendorId: vendor.id },
      include: {
        event: {
          include: {
            organizer: {
              include: {
                user: {
                  select: { id: true, email: true }
                }
              }
            },
            requirements: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const inquiryIds = requests.map(r => r.id);
    const quotes = await prisma.quote.findMany({
      where: {
        vendorId: vendor.id,
        inquiryId: { in: inquiryIds }
      }
    });

    const quoteMap = new Map();
    quotes.forEach(q => quoteMap.set(q.inquiryId, q));

    const enriched = requests.map(r => ({
      ...r,
      quote: quoteMap.get(r.id) || null
    }));

    res.json(enriched);
  } catch (error) {
    console.error('[Vendor Requests Fetch Error]', error);
    res.status(500).json({ message: 'Error fetching vendor requests' });
  }
};

const getVendorRequestById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const request = await prisma.vendorInquiry.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        event: {
          include: {
            organizer: {
              include: {
                user: {
                  select: { id: true, email: true }
                }
              }
            },
            requirements: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    const quote = await prisma.quote.findFirst({
      where: { vendorId: vendor.id, inquiryId: request.id }
    });

    res.json({
      ...request,
      quote: quote || null
    });
  } catch (error) {
    console.error('[Vendor Request Detail Error]', error);
    res.status(500).json({ message: 'Error fetching request details' });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['ACCEPTED', 'DECLINED', 'RESPONDED', 'PENDING'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const inquiry = await prisma.vendorInquiry.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        event: {
          include: {
            organizer: true
          }
        }
      }
    });

    if (!inquiry) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    // Prevent duplicate status updates
    if (inquiry.status === status) {
      return res.status(400).json({ message: `Request is already ${status.toLowerCase()}` });
    }

    // Prevent transitions once declined
    if (inquiry.status === 'DECLINED') {
      return res.status(400).json({ message: 'Cannot change status of a declined request' });
    }

    const updated = await prisma.vendorInquiry.update({
      where: { id },
      data: { status }
    });

    // Notify the organizer about the vendor's response
    if (inquiry.event?.organizer?.userId) {
      const organizerUserId = inquiry.event.organizer.userId;
      const eventTitle = inquiry.event.title || 'your event';

      let notifTitle = 'Inquiry Updated';
      let notifContent = `${vendor.businessName} has updated the status of your inquiry for "${eventTitle}" to ${status.toLowerCase()}.`;

      if (status === 'ACCEPTED') {
        notifTitle = 'Inquiry Accepted';
        notifContent = `${vendor.businessName} has accepted your inquiry for "${eventTitle}".`;
      } else if (status === 'DECLINED') {
        notifTitle = 'Inquiry Declined';
        notifContent = `${vendor.businessName} was unable to accept your inquiry for "${eventTitle}".`;
      }

      await createNotification({
        userId: organizerUserId,
        type: 'INQUIRY_RESPONSE',
        title: notifTitle,
        content: notifContent,
        eventId: inquiry.eventId,
        inquiryId: inquiry.id
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('[Update Request Status Error]', error);
    res.status(500).json({ message: 'Error updating request status' });
  }
};

module.exports = {
  getVendorRequests,
  getVendorRequestById,
  updateRequestStatus
};
