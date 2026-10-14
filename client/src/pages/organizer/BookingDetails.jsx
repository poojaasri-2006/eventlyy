import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ReviewModal } from '../../components/ReviewModal';
import { cancelBooking } from '../../api/bookings';
import { Calendar, MapPin, DollarSign, FileText, ArrowLeft, Building2, Star } from 'lucide-react';

export const BookingDetails = () => {
  const { id } = useParams();
  const { token } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication expired or unauthorized. Please log in again.');
      }
      
      if (res.status === 404) {
        throw new Error('Booking not found.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to fetch booking details');
      }
      
      const data = await res.json();
      setBooking(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id, token]);

  const handleCancelBooking = async () => {
    if (!booking || booking.status !== 'CONFIRMED' || cancelling) return;

    setCancelling(true);
    setCancellationError('');
    try {
      const updatedBooking = await cancelBooking(booking.id, token);
      setBooking((currentBooking) => ({ ...currentBooking, ...updatedBooking }));
      setBookingToCancel(false);
    } catch (cancelError) {
      console.error('[Organizer Booking Cancellation Error]', cancelError);
      setCancellationError(cancelError.message || 'Unable to cancel this booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <Card>
          <h2 style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>Oops!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/organizer/bookings" style={{ textDecoration: 'none' }}>
              <Button variant="outline">Back to Bookings</Button>
            </Link>
            <Button variant="primary" onClick={fetchBooking}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/organizer/bookings" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-rose)', fontWeight: '500', marginBottom: '1rem' }}>
          <ArrowLeft size={18} />
          Back to Bookings
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Booking Details</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Created on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={
            booking.status === 'CONFIRMED' ? 'success' : 
            booking.status === 'COMPLETED' ? 'info' : 
            'default'
          } style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {booking.status === 'CANCELLED' ? 'Cancelled' : booking.status}
          </Badge>
          {booking.status === 'CONFIRMED' && (
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => {
                setCancellationError('');
                setBookingToCancel(true);
              }}
              style={{ borderColor: '#DC2626', color: '#DC2626' }}
            >
              Cancel Booking
            </Button>
          )}
          {booking.status === 'COMPLETED' && (
            <Button
              variant={booking.review ? "outline" : "primary"}
              onClick={() => setShowReviewModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', ...(booking.review ? { borderColor: '#f59e0b', color: '#b45309' } : {}) }}
            >
              <Star size={16} fill={booking.review ? "#f59e0b" : "none"} stroke={booking.review ? "#f59e0b" : "currentColor"} />
              {booking.review ? `Reviewed (${booking.review.rating}/5) • Edit` : 'Rate & Review Vendor'}
            </Button>
          )}
        </div>
        {cancellationError && (
          <p role="alert" style={{ color: 'var(--primary-rose-dark)', margin: '1rem 0 0' }}>
            {cancellationError}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Vendor Details */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-rose-dark)' }}>
            <Building2 size={20} />
            Vendor Information
          </h3>
          
          {booking.vendor ? (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{booking.vendor.businessName}</h4>
              {booking.vendor.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {booking.vendor.description}
                </p>
              )}
              {booking.vendor.phone && (
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Phone:</strong> {booking.vendor.phone}</p>
              )}
              {booking.vendor.website && (
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                  <strong>Website:</strong> <a href={booking.vendor.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-rose)' }}>{booking.vendor.website}</a>
                </p>
              )}
              <Link to={`/organizer/vendors/${booking.vendor.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="outline" style={{ width: '100%' }}>View Full Profile</Button>
              </Link>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Vendor details are not available for this booking.</p>
          )}
        </Card>

        {/* Event Details */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-rose-dark)' }}>
            <Calendar size={20} />
            Event Information
          </h3>
          
          {booking.event ? (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{booking.event.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                <Calendar size={16} />
                <span>{booking.event.date ? new Date(booking.event.date).toLocaleDateString() : 'Date TBD'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                <MapPin size={16} />
                <span>{booking.event.location || 'Location TBD'}</span>
              </div>
              <Link to={`/organizer/events/${booking.event.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="outline" style={{ width: '100%' }}>View Event Details</Button>
              </Link>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Event details are not available.</p>
          )}
        </Card>

      </div>

      {/* Quote Details */}
      <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-rose-dark)' }}>
          <FileText size={20} />
          Quote Summary
        </h3>
        
        {booking.quote ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)', marginBottom: '1rem' }}>
              <span style={{ fontWeight: '600' }}>Agreed Total Amount</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                ${booking.quote.totalAmount.toLocaleString()}
              </span>
            </div>
            
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Quote Details & Terms</h4>
            <div style={{ 
              backgroundColor: 'var(--surface-soft)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'pre-wrap',
              fontSize: '0.95rem',
              color: 'var(--text-secondary)'
            }}>
              {booking.quote.details}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No quote information is attached to this booking.</p>
        )}
      </Card>

      {/* Submitted Review (If any) */}
      {booking.review && (
        <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-rose-dark)' }}>
              <Star size={20} fill="#f59e0b" stroke="#f59e0b" />
              Your Customer Review
            </h3>
            <Button variant="outline" onClick={() => setShowReviewModal(true)} style={{ fontSize: '0.85rem' }}>
              Edit Review
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                fill={s <= booking.review.rating ? '#f59e0b' : 'none'}
                stroke={s <= booking.review.rating ? '#f59e0b' : 'var(--border-muted)'}
              />
            ))}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: '0.25rem' }}>
              {booking.review.rating} / 5
            </span>
          </div>

          {booking.review.title && (
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {booking.review.title}
            </h4>
          )}

          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {booking.review.comment}
          </p>
        </Card>
      )}

      <ConfirmModal
        isOpen={bookingToCancel}
        onClose={() => {
          if (!cancelling) setBookingToCancel(false);
        }}
        onConfirm={handleCancelBooking}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking?"
        errorMessage={cancellationError}
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel Booking'}
        confirmDisabled={cancelling}
        cancelDisabled={cancelling}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        booking={booking}
        existingReview={booking.review}
        onSuccess={() => {
          fetchBooking();
        }}
      />
    </div>
  );
};
