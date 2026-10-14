const prisma = require('../utils/prisma');

const getVendorDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId }
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // 1. New Requests (Pending Inquiries)
    const newRequests = await prisma.vendorInquiry.findMany({
      where: { vendorId: vendor.id, status: 'PENDING' },
      include: {
        event: {
          include: { organizer: { include: { user: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const newRequestsCount = await prisma.vendorInquiry.count({
      where: { vendorId: vendor.id, status: 'PENDING' }
    });

    // 2. Pending Quotes
    const pendingQuotesCount = await prisma.quote.count({
      where: { vendorId: vendor.id, status: 'PENDING' }
    });

    // 3. Bookings
    // Because Booking doesn't have a direct relation to Quote or Vendor in the Prisma schema,
    // we must manually query Quotes for this vendor, then find Bookings matching those Quote IDs.
    const vendorQuotes = await prisma.quote.findMany({
      where: { vendorId: vendor.id }
    });
    
    const quoteIds = vendorQuotes.map(q => q.id);
    
    const vendorBookings = await prisma.booking.findMany({
      where: { quoteId: { in: quoteIds } },
      include: { event: true },
      orderBy: { createdAt: 'desc' }
    });

    const upcomingBookings = vendorBookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED') // Including both to show active
      .slice(0, 5)
      .map(booking => {
        const relatedQuote = vendorQuotes.find(q => q.id === booking.quoteId);
        return {
          ...booking,
          quoteAmount: relatedQuote ? relatedQuote.totalAmount : 0
        };
      });

    const activeBookingsCount = vendorBookings.filter(b => b.status === 'CONFIRMED').length;

    // 4. Total Earnings (Sum of confirmed/completed bookings)
    let totalEarnings = 0;
    vendorBookings.forEach(booking => {
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        const relatedQuote = vendorQuotes.find(q => q.id === booking.quoteId);
        if (relatedQuote) {
          totalEarnings += relatedQuote.totalAmount;
        }
      }
    });

    // 5. Review statistics
    const [reviewCount, reviewRatings] = await Promise.all([
      prisma.review.count({ where: { vendorId: vendor.id } }),
      prisma.review.findMany({
        where: { vendorId: vendor.id },
        select: { rating: true }
      })
    ]);
    const totalReviewScore = reviewRatings.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = reviewCount > 0 ? Math.round((totalReviewScore / reviewCount) * 10) / 10 : 0;

    // 6. Profile Completion Status
    let completedFields = 0;
    const totalFields = 8; // businessName, description, phone, website, categoryId, imageUrl, address/city, state/postalCode
    if (vendor.businessName) completedFields++;
    if (vendor.description) completedFields++;
    if (vendor.phone) completedFields++;
    if (vendor.website) completedFields++;
    if (vendor.categoryId) completedFields++;
    if (vendor.imageUrl) completedFields++;
    if (vendor.city || vendor.address) completedFields++;
    if (vendor.state || vendor.postalCode) completedFields++;
    
    const profileCompletion = Math.round((completedFields / totalFields) * 100);

    res.json({
      vendor: {
        businessName: vendor.businessName,
        imageUrl: vendor.imageUrl,
        city: vendor.city,
        state: vendor.state,
        profileCompletion
      },
      stats: {
        newRequestsCount,
        pendingQuotesCount,
        upcomingBookingsCount: activeBookingsCount,
        totalEarnings,
        totalReviews: reviewCount,
        averageRating
      },
      recentRequests: newRequests.map(req => ({
        id: req.id,
        eventName: req.event.title,
        eventDate: req.event.date,
        organizerName: req.event.organizer?.firstName 
          ? `${req.event.organizer.firstName} ${req.event.organizer.lastName}`
          : 'Organizer',
        status: req.status,
        createdAt: req.createdAt
      })),
      upcomingBookings: upcomingBookings.map(b => ({
        id: b.id,
        eventName: b.event.title,
        eventDate: b.event.date,
        status: b.status,
        amount: b.quoteAmount,
        createdAt: b.createdAt
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching vendor dashboard data' });
  }
};

module.exports = {
  getVendorDashboard
};
