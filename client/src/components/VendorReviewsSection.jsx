import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { LoadingState } from './LoadingState';
import { Star } from 'lucide-react';
import { getVendorReviews } from '../api/reviews';

export const VendorReviewsSection = ({ vendorId }) => {
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      const data = await getVendorReviews(vendorId, { page: pageNum, limit: 5 });
      if (append) {
        setReviewsData((prev) => ({
          ...data,
          reviews: [...(prev?.reviews || []), ...data.reviews]
        }));
      } else {
        setReviewsData(data);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('[VendorReviewsSection Fetch Error]', err);
      setError(err.message || 'Unable to load reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchReviews(1, false);
    }
  }, [vendorId]);

  const handleLoadMore = () => {
    if (reviewsData?.pagination && page < reviewsData.pagination.totalPages) {
      fetchReviews(page + 1, true);
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: '2rem' }}>
        <LoadingState />
      </Card>
    );
  }

  const stats = reviewsData?.stats || { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const reviews = reviewsData?.reviews || [];
  const total = stats.totalReviews || 0;
  const dist = stats.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <Card style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--primary-rose-dark)' }}>
            Customer Reviews & Ratings
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Verified feedback from organizers who completed bookings with this vendor
          </p>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
          <Star size={36} style={{ color: 'var(--surface-soft)', marginBottom: '0.75rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No reviews yet</h3>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            This vendor has not received any customer reviews yet. Reviews can be submitted once a booking is marked completed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary & Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)' }}>
            {/* Overall Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              <div style={{ display: 'flex', gap: '0.2rem', margin: '0.5rem 0', color: '#f59e0b' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    fill={star <= Math.round(stats.averageRating) ? '#f59e0b' : 'none'}
                    stroke={star <= Math.round(stats.averageRating) ? '#f59e0b' : 'var(--text-secondary)'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Based on {total} {total === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Distribution Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', justifyContent: 'center' }}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = dist[stars] || 0;
                const percent = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <span style={{ width: '40px', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {stars} <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                    </span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          backgroundColor: 'var(--primary-rose)',
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                    <span style={{ width: '32px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              All Reviews ({total})
            </h3>

            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--surface-soft)',
                  borderRadius: 'var(--radius-normal)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {rev.reviewerName}
                    </span>
                    {rev.eventTitle && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        • Event: <em>{rev.eventTitle}</em>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '0.15rem', color: '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        fill={s <= rev.rating ? '#f59e0b' : 'none'}
                        stroke={s <= rev.rating ? '#f59e0b' : 'var(--border-muted)'}
                      />
                    ))}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginLeft: '0.25rem' }}>
                    {rev.rating}/5
                  </span>
                </div>

                {rev.title && (
                  <h4 style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {rev.title}
                  </h4>
                )}

                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {rev.comment}
                </p>
              </div>
            ))}

            {reviewsData?.pagination && page < reviewsData.pagination.totalPages && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading more...' : 'Load More Reviews'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
