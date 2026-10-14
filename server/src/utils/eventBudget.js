const BOOKING_BUDGET_STATUSES = ['CONFIRMED', 'COMPLETED'];

/**
 * Calculates committed booking totals for a set of events.
 */
const getCommittedBookingTotals = async (db, eventIds) => {
  if (!eventIds.length) return new Map();

  const bookings = await db.booking.findMany({
    where: {
      eventId: { in: eventIds },
      status: { in: BOOKING_BUDGET_STATUSES }
    },
    select: { eventId: true, quoteId: true }
  });
  const quoteIds = [...new Set(bookings.map((booking) => booking.quoteId))];
  if (!quoteIds.length) return new Map();

  const quotes = await db.quote.findMany({
    where: { id: { in: quoteIds } },
    select: { id: true, inquiryId: true, vendorId: true, totalAmount: true, status: true }
  });
  const inquiries = await db.vendorInquiry.findMany({
    where: { id: { in: [...new Set(quotes.map((quote) => quote.inquiryId))] } },
    select: { id: true, eventId: true, vendorId: true }
  });
  const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
  const inquiryById = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));
  const totals = new Map();

  bookings.forEach((booking) => {
    const quote = quoteById.get(booking.quoteId);
    const inquiry = quote ? inquiryById.get(quote.inquiryId) : null;
    if (
      !quote ||
      quote.status !== 'ACCEPTED' ||
      !inquiry ||
      inquiry.eventId !== booking.eventId ||
      inquiry.vendorId !== quote.vendorId ||
      !Number.isFinite(quote.totalAmount) ||
      quote.totalAmount <= 0
    ) {
      return;
    }
    totals.set(booking.eventId, (totals.get(booking.eventId) || 0) + quote.totalAmount);
  });

  return totals;
};

/**
 * Retrieves the full list of expenses (confirmed & completed bookings)
 * and detailed activity history (deductions & cancellations) for an event.
 */
const getEventBudgetExpensesAndActivity = async (db, eventId, eventTitle = 'Event') => {
  const allBookings = await db.booking.findMany({
    where: { eventId },
    include: {
      event: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!allBookings.length) {
    return { expenses: [], activityHistory: [] };
  }

  const quoteIds = [...new Set(allBookings.map((b) => b.quoteId))];
  const quotes = await db.quote.findMany({
    where: { id: { in: quoteIds } },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          category: { select: { name: true } }
        }
      }
    }
  });
  const quoteMap = new Map(quotes.map((q) => [q.id, q]));

  const expenses = [];
  const activityHistory = [];

  for (const booking of allBookings) {
    const quote = quoteMap.get(booking.quoteId);
    if (!quote || !quote.vendor) continue;

    const vendorName = quote.vendor.businessName || 'Vendor';
    const categoryName = quote.vendor.category?.name || 'Vendor Service';
    const amount = Number(quote.totalAmount) || 0;
    const formattedAmount = `₹${amount.toLocaleString()}`;

    // Extract first line of quote details or fallback to category service description
    const firstLineDetails = (quote.details || '').split('\n')[0].replace(/^#+\s*/, '').trim();
    const serviceName = firstLineDetails && firstLineDetails.length < 80
      ? firstLineDetails
      : `${categoryName} Service`;

    // 1. If CONFIRMED or COMPLETED -> Active expense deducting from budget
    if (BOOKING_BUDGET_STATUSES.includes(booking.status)) {
      expenses.push({
        id: booking.id,
        bookingId: booking.id,
        expenseName: serviceName,
        vendorName,
        category: categoryName,
        eventName: booking.event?.title || eventTitle,
        bookingDate: booking.createdAt,
        amount,
        status: booking.status === 'COMPLETED' ? 'Completed' : 'Confirmed',
        statusCode: booking.status,
        reason: `${formattedAmount} deducted because the ${categoryName.toLowerCase()} booking with ${vendorName} was confirmed.`
      });

      // Activity: Addition to booked expenses
      activityHistory.push({
        id: `act-add-${booking.id}`,
        bookingId: booking.id,
        type: 'DEDUCTION_ADDED',
        amount,
        timestamp: booking.createdAt,
        message: `${formattedAmount} added to booked expenses because the ${categoryName.toLowerCase()} booking was confirmed with ${vendorName}.`
      });
    } else if (booking.status === 'CANCELLED') {
      // Activity: Removal from booked expenses due to cancellation
      activityHistory.push({
        id: `act-cancel-${booking.id}`,
        bookingId: booking.id,
        type: 'DEDUCTION_REMOVED',
        amount,
        timestamp: booking.createdAt,
        message: `${formattedAmount} removed from booked expenses because the ${categoryName.toLowerCase()} booking with ${vendorName} was cancelled.`
      });
    }
  }

  // Sort activity history newest first
  activityHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { expenses, activityHistory };
};

const summarizeBudget = (budget, committedBookingTotal, expenses = [], activityHistory = []) => {
  const totalBudget = budget?.totalBudget || 0;
  const totalAllocated = committedBookingTotal;
  const remainingBudget = totalBudget - totalAllocated;

  return {
    ...budget,
    items: expenses,
    expenses,
    activityHistory,
    confirmedBookingTotal: committedBookingTotal,
    totalAllocated,
    remainingBudget,
    overBudget: totalAllocated > totalBudget
  };
};

module.exports = {
  getCommittedBookingTotals,
  getEventBudgetExpensesAndActivity,
  summarizeBudget
};
