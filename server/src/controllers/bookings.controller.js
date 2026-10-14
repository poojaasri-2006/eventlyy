const prisma = require('../utils/prisma');
const { createNotification } = require('../utils/createNotification');

const enrichBookings = async (bookings) => {
  const quoteIds = [...new Set(bookings.map((booking) => booking.quoteId).filter(Boolean))];
  if (quoteIds.length === 0) {
    return bookings.map((booking) => ({ ...booking, quote: null, vendor: null }));
  }

  const quotes = await prisma.quote.findMany({
    where: { id: { in: quoteIds } },
    include: { vendor: true }
  });
  const inquiryIds = [...new Set(quotes.map((quote) => quote.inquiryId))];
  const inquiries = await prisma.vendorInquiry.findMany({
    where: { id: { in: inquiryIds } },
    select: {
      id: true,
      eventId: true,
      vendorId: true,
      message: true,
      createdAt: true
    }
  });
  const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));
  const inquiryMap = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));

  return bookings.map((booking) => {
    const storedQuote = quoteMap.get(booking.quoteId) || null;
    const inquiry = storedQuote ? inquiryMap.get(storedQuote.inquiryId) : null;
    const quote = inquiry && inquiry.vendorId === storedQuote.vendorId &&
      inquiry.eventId === booking.eventId
      ? { ...storedQuote, inquiry }
      : null;
    return {
      ...booking,
      quote,
      vendor: quote?.vendor || null
    };
  });
};

const getBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role === 'ORGANIZER') {
      const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
      if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

      const bookings = await prisma.booking.findMany({
        where: { event: { organizerId: organizer.id } },
        include: {
          event: {
            include: {
              organizer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  user: { select: { email: true } }
                }
              }
            }
          },
          review: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(await enrichBookings(bookings));
    }

    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

      const quotes = await prisma.quote.findMany({
        where: { vendorId: vendor.id },
        select: { id: true }
      });
      const quoteIds = quotes.map((quote) => quote.id);
      const bookings = quoteIds.length
        ? await prisma.booking.findMany({
            where: { quoteId: { in: quoteIds } },
              include: {
                event: {
                  include: {
                    organizer: {
                      select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        user: { select: { email: true } }
                      }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            })
        : [];

      return res.json(await enrichBookings(bookings));
    }

    return res.status(403).json({ message: 'Unauthorized role' });
  } catch (error) {
    console.error('[Get Bookings Error]', error);
    return res.status(500).json({ message: 'Error fetching bookings' });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            organizer: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                user: { select: { email: true } }
              }
            }
          }
        },
        review: true
      }
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let quote;
    if (req.user.role === 'ORGANIZER') {
      const organizer = await prisma.organizerProfile.findUnique({
        where: { userId: req.user.id }
      });
      if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
      if (booking.event.organizerId !== organizer.id) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      quote = await prisma.quote.findUnique({
        where: { id: booking.quoteId },
        include: { vendor: true }
      });
    } else if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id }
      });
      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
      quote = await prisma.quote.findFirst({
        where: { id: booking.quoteId, vendorId: vendor.id },
        include: { vendor: true }
      });
      if (!quote) return res.status(404).json({ message: 'Booking not found' });
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    let inquiry = null;
    if (quote) {
      inquiry = await prisma.vendorInquiry.findFirst({
        where: {
          id: quote.inquiryId,
          vendorId: quote.vendorId,
          eventId: booking.eventId
        },
        select: {
          id: true,
          eventId: true,
          vendorId: true,
          message: true,
          createdAt: true
        }
      });
    }
    if (!inquiry) return res.status(404).json({ message: 'Booking not found' });

    res.json({
      ...booking,
      quote: { ...quote, inquiry },
      vendor: quote.vendor
    });
  } catch (error) {
    console.error('[Get Booking By ID Error]', error);
    res.status(500).json({ message: 'Error fetching booking details' });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body?.status;
    const userId = req.user.id;

    if (!['CANCELLED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be CANCELLED or COMPLETED.' });
    }

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.event.organizerId !== organizer.id) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'CONFIRMED') {
      return res.status(409).json({ message: `Cannot change a booking that is already ${booking.status}` });
    }

    const updatedCount = await prisma.booking.updateMany({
      where: { id, status: 'CONFIRMED' },
      data: { status }
    });
    if (updatedCount.count !== 1) {
      return res.status(409).json({ message: 'This booking has already been updated' });
    }
    const updatedBooking = await prisma.booking.findUnique({ where: { id } });

    await createNotification({
      userId,
      type: 'BOOKING_UPDATED',
      title: `Booking ${status.toLowerCase()}`,
      content: `Booking for event "${booking.event.title}" has been marked as ${status.toLowerCase()}.`,
      eventId: booking.eventId,
      bookingId: id
    });

    const quote = await prisma.quote.findUnique({
      where: { id: booking.quoteId },
      include: { vendor: true }
    });
    if (quote) {
      await createNotification({
        userId: quote.vendor.userId,
        type: 'BOOKING_UPDATED',
        title: `Booking ${status.toLowerCase()}`,
        content: `Your booking for event "${booking.event.title}" has been marked as ${status.toLowerCase()} by the organizer.`,
        eventId: booking.eventId,
        bookingId: id,
        quoteId: booking.quoteId
      });
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('[Update Booking Status Error]', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

module.exports = { getBookings, getBookingById, updateBookingStatus };
