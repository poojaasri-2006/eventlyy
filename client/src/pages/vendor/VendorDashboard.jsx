import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { LoadingState } from '../../components/LoadingState';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  Package, 
  Calendar, 
  FileText, 
  MessageSquare,
  DollarSign,
  CheckSquare,
  AlertCircle,
  Star
} from 'lucide-react';

export const VendorDashboard = () => {
  const { token, user } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/vendor-dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load dashboard data');
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  if (loading && !data) return <LoadingState />;

  if (error && !data) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
      </Card>
    );
  }

  const { vendor, stats, recentRequests, upcomingBookings } = data || {};
  const vendorName = vendor?.businessName || user?.fullName || 'Vendor';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Welcome back, {vendorName}!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your business today.</p>
        </div>
        
        {vendor?.profileCompletion < 100 && (
          <div style={{ backgroundColor: 'var(--surface-soft)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>Profile {vendor.profileCompletion}% complete</p>
              <Link to="/vendor/profile" style={{ fontSize: '0.8rem', color: 'var(--primary-rose)', textDecoration: 'none' }}>Complete your profile</Link>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <Card style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>New Requests</p>
            <FileText size={20} color="#3b82f6" />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>{stats?.newRequestsCount || 0}</h2>
        </Card>
        
        <Card style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Pending Quotes</p>
            <FileText size={20} color="#f59e0b" />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>{stats?.pendingQuotesCount || 0}</h2>
        </Card>

        <Card style={{ padding: '1.5rem', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Active Bookings</p>
            <CheckSquare size={20} color="#10b981" />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>{stats?.upcomingBookingsCount || 0}</h2>
        </Card>

        <Card style={{ padding: '1.5rem', borderTop: '4px solid var(--primary-rose)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Total Earnings</p>
            <DollarSign size={20} color="var(--primary-rose)" />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>${(stats?.totalEarnings || 0).toLocaleString()}</h2>
        </Card>

        <Card style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Customer Rating</p>
            <Star size={20} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>
              {stats?.totalReviews > 0 ? Number(stats.averageRating).toFixed(1) : '—'}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {stats?.totalReviews > 0 ? `(${stats.totalReviews} ${stats.totalReviews === 1 ? 'review' : 'reviews'})` : 'No reviews'}
            </span>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Recent Requests */}
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>New Requests</h3>
              <Link to="/vendor/requests" style={{ fontSize: '0.9rem', color: 'var(--primary-rose)', textDecoration: 'none' }}>View All</Link>
            </div>
            
            {recentRequests && recentRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: '500', color: 'var(--text-primary)' }}>{req.eventName}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        from {req.organizerName} • {req.eventDate ? new Date(req.eventDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                    <Link to={`/vendor/requests/${req.id}`}>
                      <Button variant="outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Reply</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <p>No new requests at the moment.</p>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Link to="/vendor/services" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--background-rose-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary-rose-dark)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Briefcase size={24} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Services</span>
                </div>
              </Link>
              <Link to="/vendor/packages" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--background-rose-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary-rose-dark)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Package size={24} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Packages</span>
                </div>
              </Link>
              <Link to="/vendor/availability" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--background-rose-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary-rose-dark)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Calendar size={24} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Availability</span>
                </div>
              </Link>
              <Link to="/vendor/messages" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--background-rose-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary-rose-dark)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <MessageSquare size={24} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Messages</span>
                </div>
              </Link>
              <Link to="/vendor/reviews" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--background-rose-light)', borderRadius: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Star size={24} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Reviews</span>
                </div>
              </Link>
            </div>
          </Card>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Upcoming Bookings */}
          <Card style={{ padding: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Upcoming Bookings</h3>
              <Link to="/vendor/bookings" style={{ fontSize: '0.9rem', color: 'var(--primary-rose)', textDecoration: 'none' }}>View All</Link>
            </div>

            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {upcomingBookings.map(booking => (
                  <div key={booking.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                      backgroundColor: 'var(--primary-rose-tint)', 
                      color: 'var(--primary-rose-dark)', 
                      padding: '0.5rem', 
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '50px'
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                        {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                        {booking.eventDate ? new Date(booking.eventDate).getDate() : '-'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: '500', color: 'var(--text-primary)' }}>{booking.eventName}</p>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Status: <span style={{ color: booking.status === 'CONFIRMED' ? '#10b981' : 'var(--text-secondary)' }}>{booking.status}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>${(booking.amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                <CheckSquare size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
                <p>No upcoming bookings right now.</p>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
};
