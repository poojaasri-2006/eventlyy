import API_BASE_URL from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { ArrowLeft, Calendar, Clock, DollarSign, Mail, MapPin, Phone, Search } from 'lucide-react';

const formatAmount = (amount) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD'
}).format(amount);

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'Date not set';

const organizerName = (organizer) => (
  organizer ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() : ''
);

const readApiResponse = async (response) => {
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message ||
      (responseText && responseText.trim().startsWith('<')
        ? `The bookings API returned HTTP ${response.status} with a non-JSON response. Check that the current backend is running.`
        : responseText) ||
      `Bookings request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return data;
};

const OrganizerContact = ({ organizer }) => {
  const name = organizerName(organizer);
  if (!name && !organizer?.phone && !organizer?.user?.email) return null;

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
      <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Organizer</h3>
      {name && <div style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>{name}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        {organizer?.user?.email && (
          <a href={`mailto:${organizer.user.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'inherit' }}>
            <Mail size={15} />{organizer.user.email}
          </a>
        )}
        {organizer?.phone && (
          <a href={`tel:${organizer.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'inherit' }}>
            <Phone size={15} />{organizer.phone}
          </a>
        )}
      </div>
    </div>
  );
};

const QuoteInformation = ({ quote }) => (
  quote ? (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-rose-dark)', fontWeight: 600 }}>
          <DollarSign size={17} />{formatAmount(quote.totalAmount)}
        </div>
        <Badge status={quote.status}>{quote.status}</Badge>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Quote submitted {formatDate(quote.createdAt)}
        </span>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Quote and service/package details
        </div>
        <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
          {quote.details || 'No additional quote details provided.'}
        </p>
      </div>
      {quote.inquiry?.message && (
        <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <strong>Original request:</strong> {quote.inquiry.message}
        </div>
      )}
    </div>
  ) : (
    <p style={{ margin: '1rem 0 0', color: 'var(--text-secondary)' }}>
      Quote details are not available for this booking.
    </p>
  )
);

export const VendorBookings = () => {
  const { token } = useAuth();
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadBookings = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/vendor/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await readApiResponse(response);
    if (!Array.isArray(data)) {
      throw new Error('The bookings API returned an invalid response. Expected a list of bookings.');
    }
    return data;
  }, [token]);

  const loadBookingDetails = useCallback(async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/vendor/bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await readApiResponse(response);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('The booking API returned an invalid booking detail response.');
    }
    return data;
  }, [token]);

  const refreshBookings = useCallback(async () => {
    try {
      const data = await loadBookings();
      setBookings(data);
      setError(null);
    } catch (fetchError) {
      console.error('[Vendor Bookings Fetch Error]', fetchError);
      setError(fetchError.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [loadBookings]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadBookings(),
      bookingId ? loadBookingDetails(bookingId) : Promise.resolve(null)
    ])
      .then(([bookingData, detailData]) => {
        if (active) {
          setBookings(bookingData);
          setSelectedBooking(detailData);
          setError(null);
        }
      })
      .catch((fetchError) => {
        console.error('[Vendor Bookings Fetch Error]', fetchError);
        if (active) {
          setError(fetchError.message || 'Unable to load bookings.');
          setSelectedBooking(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, loadBookingDetails, loadBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.toLowerCase();
    const eventMatches = booking.event?.title?.toLowerCase().includes(query);
    const organizerMatches = organizerName(booking.event?.organizer).toLowerCase().includes(query);
    return (eventMatches || organizerMatches) &&
      (statusFilter === 'ALL' || booking.status === statusFilter);
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button
          variant="primary"
          onClick={() => {
            setLoading(true);
            refreshBookings();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (bookingId) {
    if (!selectedBooking) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Booking not found.</p>
          <Button variant="outline" onClick={() => navigate('/vendor/bookings')}>Back to Bookings</Button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
        <Link to="/vendor/bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.25rem' }}>
          <ArrowLeft size={17} /> Back to Bookings
        </Link>
        <Card style={{ padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem', color: 'var(--primary-rose-dark)' }}>
                {selectedBooking.event?.title || 'Event Booking'}
              </h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Booking reference: {selectedBooking.id}
              </p>
            </div>
            <Badge status={selectedBooking.status}>{selectedBooking.status}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Calendar size={17} /> Event date
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedBooking.event?.date)}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <MapPin size={17} /> Venue
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedBooking.event?.location || 'Venue not specified'}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Clock size={17} /> Booking created
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedBooking.createdAt)}</strong>
            </div>
          </div>

          <OrganizerContact organizer={selectedBooking.event?.organizer} />
          <QuoteInformation quote={selectedBooking.quote} />

          <p style={{ margin: '1.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Booking status is managed by the organizer.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Bookings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bookings created from quotes accepted by organizers.</p>
        </div>
        <Button variant="outline" onClick={refreshBookings}>Refresh</Button>
      </div>

      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input
              type="search"
              placeholder="Search by event or organizer..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <select
            aria-label="Filter bookings by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', fontFamily: 'inherit', minWidth: '160px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </Card>

      {filteredBookings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredBookings.map((booking) => (
            <Card key={booking.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 0.75rem', color: 'var(--primary-rose-dark)', fontSize: '1.2rem' }}>
                    {booking.event?.title || 'Event'}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={16} />{formatDate(booking.event?.date)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={16} />{booking.event?.location || 'Venue not specified'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} />Booked {formatDate(booking.createdAt)}
                    </span>
                  </div>
                  <OrganizerContact organizer={booking.event?.organizer} />
                  <QuoteInformation quote={booking.quote} />
                </div>
                <Badge status={booking.status}>{booking.status}</Badge>
              </div>
              <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/vendor/bookings/${booking.id}`} style={{ textDecoration: 'none' }}>
                  <Button variant="primary">Booking Details</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            {bookings.length ? 'No bookings match these filters' : 'No bookings yet'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {bookings.length
              ? 'Try changing your search or status filter.'
              : 'Accepted quotes will appear here as bookings.'}
          </p>
        </Card>
      )}
    </div>
  );
};
