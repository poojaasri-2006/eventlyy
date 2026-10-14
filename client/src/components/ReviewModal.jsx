import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Star, X } from 'lucide-react';
import { createReview, updateReview } from '../api/reviews';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export const ReviewModal = ({
  isOpen,
  onClose,
  booking,
  existingReview = null,
  onSuccess
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setError('');
    setSuccess('');
  }, [existingReview, isOpen]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      setError('Please provide written feedback for your review.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Written feedback must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const isEditing = Boolean(existingReview?.id);

      if (isEditing) {
        await updateReview(existingReview.id, { rating, title, comment }, token);
      } else {
        await createReview({ bookingId: booking.id, rating, title, comment }, token);
      }

      setSuccess(isEditing ? 'Review updated successfully!' : 'Review submitted successfully!');

      // Brief success flash before closing
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      setError(err.message || 'An error occurred while saving your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const vendorName = booking.vendor?.businessName || 'the vendor';
  const eventTitle = booking.event?.title || 'your event';
  const displayRating = hoverRating || rating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        backdropFilter: 'blur(2px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <Card style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'slideUp 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 id="review-modal-title" style={{ margin: 0, color: 'var(--primary-rose-dark)', fontSize: '1.2rem' }}>
              {existingReview ? 'Edit Your Review' : 'Rate & Review Vendor'}
            </h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              For <strong style={{ color: 'var(--text-primary)' }}>{vendorName}</strong>
              <span style={{ marginLeft: '0.3rem', color: 'var(--text-secondary)' }}>· {eventTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close review form"
            style={{
              background: 'none',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              color: 'var(--primary-rose-dark)',
              backgroundColor: 'var(--primary-rose-tint)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-normal)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              borderLeft: '3px solid var(--primary-rose)'
            }}
          >
            {error}
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div
            role="status"
            style={{
              color: '#166534',
              backgroundColor: '#dcfce7',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-normal)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              borderLeft: '3px solid #16a34a',
              fontWeight: 500
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>

          {/* Star Rating Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Overall Rating <span style={{ color: 'var(--primary-rose)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = displayRating >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submitting}
                    aria-label={`Rate ${star} out of 5 stars`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      padding: '0.2rem',
                      color: isFilled ? '#f59e0b' : 'var(--border-muted)',
                      transition: 'transform 0.12s ease, color 0.12s ease',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                    }}
                    title={STAR_LABELS[star]}
                  >
                    <Star
                      size={30}
                      fill={isFilled ? '#f59e0b' : 'none'}
                      stroke={isFilled ? '#f59e0b' : 'var(--border-muted)'}
                    />
                  </button>
                );
              })}
              <div style={{ marginLeft: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {displayRating}/5
                </span>
                {STAR_LABELS[displayRating] && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.85rem', color: 'var(--primary-rose)', fontWeight: 500 }}>
                    — {STAR_LABELS[displayRating]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Review Title (optional) */}
          <div>
            <label
              htmlFor="review-title"
              style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}
            >
              Review Title <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              placeholder="e.g. Exceptional service and professionalism!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              maxLength={120}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                border: '1px solid var(--surface-soft)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                backgroundColor: submitting ? 'var(--surface-soft)' : '#fff',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary-rose)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--surface-soft)'; }}
            />
          </div>

          {/* Written Feedback (required) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <label
                htmlFor="review-comment"
                style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}
              >
                Written Feedback <span style={{ color: 'var(--primary-rose)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.8rem', color: comment.length < 10 ? 'var(--primary-rose)' : 'var(--text-secondary)' }}>
                {comment.length} / 10 min chars
              </span>
            </div>
            <textarea
              id="review-comment"
              placeholder="Share details of your experience with this vendor during your event — quality, punctuality, communication, and overall satisfaction..."
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              required
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                border: '1px solid var(--surface-soft)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                backgroundColor: submitting ? 'var(--surface-soft)' : '#fff',
                color: 'var(--text-primary)',
                lineHeight: 1.55
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary-rose)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--surface-soft)'; }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Your honest feedback helps other organizers and encourages quality service.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || Boolean(success)}
              style={{ minWidth: '130px' }}
            >
              {submitting
                ? 'Saving...'
                : success
                  ? '✓ Saved!'
                  : existingReview
                    ? 'Update Review'
                    : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Card>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
};
