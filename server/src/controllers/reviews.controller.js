const prisma = require('../utils/prisma');
const { createNotification } = require('../utils/createNotification');

/**
 * GET /api/reviews/vendor/:vendorId
 * Public/authenticated: Returns reviews, pagination, rating distribution, and average for a vendor.
 */
const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId }
    });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const [reviews, totalCount, allRatings] = await Promise.all([
      prisma.review.findMany({
        where: { vendorId },
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          booking: {
            include: {
              event: {
                select: {
                  title: true,
                  date: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: { vendorId } }),
      prisma.review.findMany({
        where: { vendorId },
        select: { rating: true }
      })
    ]);

    // Calculate rating distribution and average
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    allRatings.forEach(r => {
      const val = Math.min(5, Math.max(1, r.rating));
      distribution[val] = (distribution[val] || 0) + 1;
      sum += val;
    });

    const averageRating = totalCount > 0 ? Math.round((sum / totalCount) * 10) / 10 : 0;

    const formattedReviews = reviews.map(r => {
      const reviewerName = r.organizer
        ? `${r.organizer.firstName || ''} ${r.organizer.lastName || ''}`.trim() || 'Verified Organizer'
        : 'Organizer';
      return {
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        reviewerName,
        eventTitle: r.booking?.event?.title || null,
        bookingId: r.bookingId
      };
    });

    res.json({
      reviews: formattedReviews,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: {
        averageRating,
        totalReviews: totalCount,
        distribution
      }
    });
  } catch (error) {
    console.error('[getVendorReviews Error]', error);
    res.status(500).json({ message: 'Error fetching vendor reviews' });
  }
};

/**
 * GET /api/reviews/organizer
 * Organizer only: Returns all reviews submitted by the authenticated organizer and eligible completed bookings.
 */
const getOrganizerReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }

    // 1. Reviews submitted by organizer
    const reviews = await prisma.review.findMany({
      where: { organizerId: organizer.id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            imageUrl: true,
            category: { select: { name: true } }
          }
        },
        booking: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Completed bookings eligible for review
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        event: { organizerId: organizer.id }
      },
      include: {
        event: { select: { id: true, title: true, date: true } },
        review: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Resolve vendors for completed bookings
    const quoteIds = completedBookings.map(b => b.quoteId);
    const quotes = await prisma.quote.findMany({
      where: { id: { in: quoteIds } },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            imageUrl: true,
            category: { select: { name: true } }
          }
        }
      }
    });
    const quoteMap = new Map(quotes.map(q => [q.id, q]));

    const eligibleBookings = completedBookings.map(b => {
      const quote = quoteMap.get(b.quoteId);
      return {
        id: b.id,
        status: b.status,
        event: b.event,
        vendor: quote?.vendor || null,
        review: b.review || null,
        hasReviewed: Boolean(b.review)
      };
    });

    res.json({
      reviews,
      eligibleBookings
    });
  } catch (error) {
    console.error('[getOrganizerReviews Error]', error);
    res.status(500).json({ message: 'Error fetching organizer reviews' });
  }
};

/**
 * POST /api/reviews
 * Organizer creates a review for a completed booking.
 */
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, rating, title, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Written feedback comment is required.' });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }

    // Verify booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        review: true
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Authorization: only the organizer who owns the event can review
    if (booking.event.organizerId !== organizer.id) {
      return res.status(403).json({ message: 'You are not authorized to review this booking.' });
    }

    // Validation: Booking must be COMPLETED
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        message: `Only completed event bookings can be reviewed. Current status is ${booking.status}.`
      });
    }

    // Duplicate check
    if (booking.review) {
      return res.status(409).json({
        message: 'A review has already been submitted for this booking.'
      });
    }

    // Find vendor from quote
    const quote = await prisma.quote.findUnique({
      where: { id: booking.quoteId },
      include: { vendor: { include: { user: true } } }
    });

    if (!quote || !quote.vendor) {
      return res.status(400).json({ message: 'Vendor for this booking could not be identified.' });
    }

    const newReview = await prisma.review.create({
      data: {
        vendorId: quote.vendor.id,
        organizerId: organizer.id,
        bookingId: booking.id,
        rating: numRating,
        title: title ? title.trim() : null,
        comment: comment.trim()
      }
    });

    // Notify the vendor of new customer review
    if (quote.vendor.userId) {
      await createNotification({
        userId: quote.vendor.userId,
        type: 'GENERAL',
        title: 'New Customer Review Received',
        content: `Organizer reviewed your service for event "${booking.event.title}" with ${numRating} stars.`
      });
    }

    res.status(201).json(newReview);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A review already exists for this booking.' });
    }
    console.error('[createReview Error]', error);
    res.status(500).json({ message: 'Error submitting review' });
  }
};

/**
 * PUT /api/reviews/:id
 * Organizer updates their own existing review.
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, title, comment } = req.body;

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }

    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.organizerId !== organizer.id) {
      return res.status(403).json({ message: 'You can only edit your own reviews.' });
    }

    const updateData = {};
    if (rating !== undefined) {
      const numRating = parseInt(rating, 10);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
      }
      updateData.rating = numRating;
    }

    if (title !== undefined) {
      updateData.title = title ? title.trim() : null;
    }

    if (comment !== undefined) {
      if (!comment.trim()) {
        return res.status(400).json({ message: 'Written feedback cannot be empty.' });
      }
      updateData.comment = comment.trim();
    }

    const updated = await prisma.review.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('[updateReview Error]', error);
    res.status(500).json({ message: 'Error updating review' });
  }
};

/**
 * GET /api/reviews/vendor-dashboard
 * Vendor only: Returns review overview, stats, distribution, and list of customer reviews received.
 */
const getVendorDashboardReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId }
    });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    const [reviews, totalCount, allRatings] = await Promise.all([
      prisma.review.findMany({
        where: { vendorId: vendor.id },
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          booking: {
            include: {
              event: {
                select: {
                  title: true,
                  date: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({ where: { vendorId: vendor.id } }),
      prisma.review.findMany({
        where: { vendorId: vendor.id },
        select: { rating: true }
      })
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    allRatings.forEach(r => {
      const val = Math.min(5, Math.max(1, r.rating));
      distribution[val] = (distribution[val] || 0) + 1;
      sum += val;
    });

    const averageRating = totalCount > 0 ? Math.round((sum / totalCount) * 10) / 10 : 0;

    res.json({
      stats: {
        averageRating,
        totalReviews: totalCount,
        distribution
      },
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewerName: r.organizer
          ? `${r.organizer.firstName || ''} ${r.organizer.lastName || ''}`.trim() || 'Verified Organizer'
          : 'Organizer',
        eventTitle: r.booking?.event?.title || null
      }))
    });
  } catch (error) {
    console.error('[getVendorDashboardReviews Error]', error);
    res.status(500).json({ message: 'Error fetching vendor reviews' });
  }
};

module.exports = {
  getVendorReviews,
  getOrganizerReviews,
  createReview,
  updateReview,
  getVendorDashboardReviews
};
