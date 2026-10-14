import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { LoadingState } from '../../components/LoadingState';
import { Button } from '../../components/Button';
import { Star, MessageSquare } from 'lucide-react';
import { getVendorDashboardReviews } from '../../api/reviews';

export const VendorReviews = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await getVendorDashboardReviews(token);
      setData(json);
    } catch (err) {
      console.error('[VendorReviews Error]', err);
      setError(err.message || 'Error fetching reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReviews();
    }
  }, [token]);

  if (loading) return <LoadingState />;

  const stats = data?.stats || { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const reviews = data?.reviews || [];
  const total = stats.totalReviews || 0;
  const dist = stats.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Customer Reviews</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real reviews and feedback submitted by organizers after completed event bookings.
          </p>
        </div>
        <Button variant="outline" onClick={fetchReviews}>
          Refresh
        </Button>
      </div>

      {error && (
        <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '1rem', borderRadius: 'var(--radius-normal)' }}>
          {error}
        </div>
      )}

      {/* Summary Score & Distribution Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', margin: '0.75rem 0', color: '#f59e0b' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={24}
                fill={s <= Math.round(stats.averageRating) ? '#f59e0b' : 'none'}
                stroke={s <= Math.round(stats.averageRating) ? '#f59e0b' : 'var(--text-secondary)'}
              />
            ))}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Average rating across {total} verified {total === 1 ? 'review' : 'reviews'}
          </p>
        </Card>

        <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.65rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Rating Breakdown
          </h3>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = dist[stars] || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ width: '45px', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {stars} <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                </span>
                <div style={{ flex: 1, height: '9px', backgroundColor: 'var(--surface-soft)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: 'var(--primary-rose)',
                      borderRadius: '999px'
                    }}
                  />
                </div>
                <span style={{ width: '35px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {count}
                </span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Reviews List */}
      <Card style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>
          Customer Feedback ({total})
        </h2>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <MessageSquare size={42} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No reviews yet</h3>
            <p style={{ margin: 0 }}>
              When organizers complete bookings with your business, their reviews and ratings will show here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
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
                        size={16}
                        fill={s <= rev.rating ? '#f59e0b' : 'none'}
                        stroke={s <= rev.rating ? '#f59e0b' : 'var(--border-muted)'}
                      />
                    ))}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: '0.25rem' }}>
                    {rev.rating}/5
                  </span>
                </div>

                {rev.title && (
                  <h4 style={{ margin: '0.25rem 0 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {rev.title}
                  </h4>
                )}

                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.55, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
