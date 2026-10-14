import API_BASE_URL from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ReviewModal } from '../../components/ReviewModal';
import { cancelBooking } from '../../api/bookings';
import { Search, Calendar, DollarSign, Clock, Star } from 'lucide-react';

const formatAmount = (amount) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD'
}).format(amount);

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'Date not set';

const QuoteCard = ({ quote, onDecide, deciding }) => {
  const vendor = quote.vendor;
  const event = quote.inquiry?.event;
  const isPending = quote.status === 'PENDING';

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          {vendor?.imageUrl ? (
            <img
              src={vendor.imageUrl}
              alt={vendor.businessName || 'Vendor profile'}
              style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-rose-tint)',
              color: 'var(--primary-rose-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '1.1rem'
            }}>
              {vendor?.businessName?.charAt(0)?.toUpperCase() || 'V'}
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary-rose-dark)' }}>
              {vendor?.businessName || 'Unknown Vendor'}
            </h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {event?.title || 'Event'}
            </div>
          </div>
        </div>
        <span style={{
          padding: '0.35rem 0.8rem',
          borderRadius: '999px',
          backgroundColor: quote.status === 'PENDING'
            ? '#FEF3C7'
            : quote.status === 'ACCEPTED' ? '#DCFCE7' : '#FEE2E2',
          color: quote.status === 'PENDING'
            ? '#B45309'
            : quote.status === 'ACCEPTED' ? '#15803D' : '#B91C1C',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          {quote.status === 'REJECTED' ? 'DECLINED' : quote.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={16} /> Event date: {formatDate(event?.date)}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} /> Submitted: {formatDate(quote.createdAt)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            Quoted price
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-rose-dark)', fontWeight: 700, fontSize: '1.1rem' }}>
            <DollarSign size={17} />{formatAmount(quote.totalAmount)}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            Quote / service / package details
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {quote.details || 'No additional details provided.'}
          </p>
        </div>
      </div>

      {isPending && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem' }}>
          <Button
            variant="outline"
            disabled={Boolean(deciding)}
            onClick={() => onDecide(quote, 'REJECTED')}
            style={{ borderColor: '#DC2626', color: '#DC2626' }}
          >
            {deciding === 'REJECTED' ? 'Declining…' : 'Decline'}
          </Button>
          <Button
            variant="primary"
            disabled={Boolean(deciding)}
            onClick={() => onDecide(quote, 'ACCEPTED')}
          >
            {deciding === 'ACCEPTED' ? 'Booking…' : 'Book / Accept'}
          </Button>
        </div>
      )}
    </Card>
  );
};

export const Bookings = () => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [decidingQuote, setDecidingQuote] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellationError, setCancellationError] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [reviewModalBooking, setReviewModalBooking] = useState(null);

  const loadData = useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [bookingsResponse, quotesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/bookings`, { headers }),
      fetch(`${API_BASE_URL}/api/quotes`, { headers })
    ]);
    const [bookingsData, quotesData] = await Promise.all([
      bookingsResponse.json().catch(() => ({})),
      quotesResponse.json().catch(() => ({}))
    ]);

    if (!bookingsResponse.ok) {
      throw new Error(bookingsData.message || 'Failed to load bookings.');
    }
    if (!quotesResponse.ok) {
      throw new Error(quotesData.message || 'Failed to load vendor quotes.');
    }

    return { bookings: bookingsData, quotes: quotesData };
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      const data = await loadData();
      setBookings(data.bookings);
      setQuotes(data.quotes);
      setError(null);
    } catch (fetchError) {
      console.error('[Organizer Bookings Fetch Error]', fetchError);
      setError(fetchError.message || 'Unable to load bookings and quotes.');
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    let active = true;
    loadData()
      .then((data) => {
        if (active) {
          setBookings(data.bookings);
          setQuotes(data.quotes);
          setError(null);
        }
      })
      .catch((fetchError) => {
        console.error('[Organizer Bookings Fetch Error]', fetchError);
        if (active) setError(fetchError.message || 'Unable to load bookings and quotes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadData]);

  const handleDecision = async (quote, status) => {
    const action = status === 'ACCEPTED' ? 'accept and book' : 'decline';
    if (!window.confirm(`Are you sure you want to ${action} this quote from ${quote.vendor?.businessName || 'this vendor'}?`)) {
      return;
    }

    setDecidingQuote({ id: quote.id, status });
    setActionMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `Unable to ${action} this quote.`);
      }

      await refresh();
      let successText = status === 'ACCEPTED'
        ? 'Quote accepted and booking created.'
        : 'Quote declined.';
      if (status === 'ACCEPTED' && quote.inquiry?.event?.id) {
        try {
          const budgetResponse = await fetch(
            `${API_BASE_URL}/api/events/${quote.inquiry.event.id}/budget`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const budget = await budgetResponse.json().catch(() => null);
          if (!budgetResponse.ok) {
            throw new Error(budget?.message || `Budget refresh failed (HTTP ${budgetResponse.status}).`);
          }
          if (budget) {
            successText += ` Booked: ${formatAmount(budget.confirmedBookingTotal || 0)}; remaining: ${formatAmount(budget.remainingBudget || 0)}.`;
          }
        } catch (budgetError) {
          console.error('[Booking Decision Budget Refresh Error]', budgetError);
          successText += ` The booking succeeded, but the budget summary could not be refreshed: ${budgetError.message}`;
        }
      }
      setActionMessage({
        type: successText.includes('could not be refreshed') ? 'warning' : 'success',
        text: successText
      });
    } catch (actionError) {
      console.error('[Organizer Quote Decision Error]', actionError);
      setActionMessage({
        type: 'error',
        text: actionError.message || `Unable to ${action} this quote.`
      });
    } finally {
      setDecidingQuote(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel || cancellingBooking) return;

    const bookingId = bookingToCancel.id;
    setCancellingBooking(bookingId);
    setCancellationError('');
    setActionMessage({ type: '', text: '' });
    try {
      const updatedBooking = await cancelBooking(bookingId, token);
      setBookings((currentBookings) => currentBookings.map((booking) => (
        booking.id === bookingId ? { ...booking, ...updatedBooking } : booking
      )));
      setBookingToCancel(null);
      setActionMessage({ type: 'success', text: 'Booking cancelled.' });
    } catch (actionError) {
      console.error('[Organizer Booking Cancellation Error]', actionError);
      setCancellationError(actionError.message || 'Unable to cancel this booking.');
      setActionMessage({
        type: 'error',
        text: actionError.message || 'Unable to cancel this booking.'
      });
    } finally {
      setCancellingBooking(null);
    }
  };

  const matchesSearch = (eventTitle, vendorName) => (
    (eventTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pendingQuotes = quotes.filter((quote) =>
    quote.status === 'PENDING' &&
    matchesSearch(quote.inquiry?.event?.title, quote.vendor?.businessName)
  );
  const bookingQuoteIds = new Set(bookings.map((booking) => booking.quoteId));
  const decidedQuotes = quotes.filter((quote) =>
    (quote.status === 'REJECTED' || (quote.status === 'ACCEPTED' && !bookingQuoteIds.has(quote.id))) &&
    matchesSearch(quote.inquiry?.event?.title, quote.vendor?.businessName)
  );
  const filteredBookings = bookings.filter((booking) => (
    matchesSearch(booking.event?.title, booking.vendor?.businessName) &&
    (statusFilter === 'ALL' || booking.status === statusFilter)
  ));

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={() => { setLoading(true); refresh(); }}>Try Again</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Bookings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review vendor quotes and manage confirmed event vendors.</p>
        </div>
        <Button variant="outline" onClick={() => { setLoading(true); refresh(); }}>Refresh</Button>
      </div>

      {actionMessage.text && (
        <div role="status" style={{
          color: actionMessage.type === 'error' ? 'var(--primary-rose-dark)' : actionMessage.type === 'warning' ? '#92400e' : '#15803D',
          backgroundColor: actionMessage.type === 'error' ? 'var(--primary-rose-tint)' : actionMessage.type === 'warning' ? '#FEF3C7' : '#DCFCE7',
          padding: '1rem',
          borderRadius: 'var(--radius-normal)',
          fontWeight: 500
        }}>
          {actionMessage.text}
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Pending Quotes</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Review a vendor’s proposal before creating a booking.</p>
        </div>
        {pendingQuotes.length > 0 ? (
          pendingQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onDecide={handleDecision}
              deciding={decidingQuote?.id === quote.id ? decidingQuote.status : null}
            />
          ))
        ) : (
          <Card style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No pending quotes for your events.
          </Card>
        )}
      </section>

      {decidedQuotes.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Other Quote Decisions</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Declined quotes and accepted quotes without a linked booking.</p>
          </div>
          {decidedQuotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} onDecide={handleDecision} deciding={null} />
          ))}
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Bookings</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Quotes accepted by you and saved as bookings.</p>
        </div>

        <Card style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
              <input
                type="text"
                placeholder="Search by event or vendor name..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: '1px solid var(--surface-soft)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--surface-soft)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                backgroundColor: '#fff',
                fontFamily: 'inherit',
                minWidth: '150px'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </Card>

        {filteredBookings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredBookings.map((booking) => (
              <Card key={booking.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-rose-dark)' }}>
                      {booking.vendor?.businessName || 'Unknown Vendor'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <Calendar size={16} />
                      <span>Event: {booking.event?.title || 'Unknown Event'}</span>
                    </div>
                    {booking.event?.date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                        <Calendar size={14} />
                        <span>{formatDate(booking.event.date)}</span>
                      </div>
                    )}
                    {booking.quote && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          <DollarSign size={14} />
                          <span style={{ fontWeight: '600' }}>Amount: {formatAmount(booking.quote.totalAmount)}</span>
                        </div>
                        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {booking.quote.details}
                        </p>
                        <div style={{ marginTop: '0.5rem' }}>
                          <Badge status={booking.quote.status} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <Badge status={booking.status}>
                      {booking.status === 'CANCELLED' ? 'Cancelled' : booking.status}
                    </Badge>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Booked on {formatDate(booking.createdAt)}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  {booking.vendor && (
                    <Link to={`/organizer/vendors/${booking.vendor.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="outline">View Vendor</Button>
                    </Link>
                  )}
                  {booking.status === 'COMPLETED' && (
                    booking.review ? (
                      <Button
                        variant="outline"
                        onClick={() => setReviewModalBooking(booking)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: '#f59e0b', color: '#b45309' }}
                      >
                        <Star size={15} fill="#f59e0b" stroke="#f59e0b" />
                        Reviewed ({booking.review.rating}/5) • Edit
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => setReviewModalBooking(booking)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Star size={15} />
                        Leave Review
                      </Button>
                    )
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <Button
                      variant="outline"
                      disabled={Boolean(cancellingBooking)}
                      onClick={() => {
                        setCancellationError('');
                        setBookingToCancel(booking);
                      }}
                      style={{ borderColor: '#DC2626', color: '#DC2626' }}
                    >
                      {cancellingBooking === booking.id ? 'Cancelling…' : 'Cancel Booking'}
                    </Button>
                  )}
                  <Link to={`/organizer/bookings/${booking.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant={booking.status === 'COMPLETED' && !booking.review ? 'outline' : 'primary'}>
                      Booking Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <Calendar size={42} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No bookings found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your filters to find what you are looking for.'
                : 'Accepted vendor quotes will appear here as bookings.'}
            </p>
          </Card>
        )}
      </section>
      <ConfirmModal
        isOpen={Boolean(bookingToCancel)}
        onClose={() => {
          if (!cancellingBooking) setBookingToCancel(null);
        }}
        onConfirm={handleCancelBooking}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking?"
        errorMessage={cancellationError}
        confirmLabel={cancellingBooking ? 'Cancelling…' : 'Cancel Booking'}
        confirmDisabled={Boolean(cancellingBooking)}
        cancelDisabled={Boolean(cancellingBooking)}
      />
      <ReviewModal
        isOpen={Boolean(reviewModalBooking)}
        onClose={() => setReviewModalBooking(null)}
        booking={reviewModalBooking}
        existingReview={reviewModalBooking?.review}
        onSuccess={() => {
          refresh();
          setActionMessage({
            type: 'success',
            text: reviewModalBooking?.review ? 'Review successfully updated!' : 'Review successfully submitted!'
          });
        }}
      />
    </div>
  );
};
