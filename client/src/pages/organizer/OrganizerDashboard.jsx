import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { VendorCard } from '../../components/VendorCard';

export const OrganizerDashboard = () => {
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    upcomingEvent: null,
    pendingRequests: 0,
    confirmedVendors: 0,
    remainingBudget: null,
    recommendedVendors: [],
    recentActivity: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Events
      const eventsRes = await fetch(`${API_BASE_URL}/api/events`, { headers });
      if (!eventsRes.ok) throw new Error('Failed to fetch events');
      const events = await eventsRes.json();
      
      const upcomingEvent = events.length > 0 ? events[0] : null;

      // Fetch Inquiries (Pending Requests)
      const inquiriesRes = await fetch(`${API_BASE_URL}/api/inquiries`, { headers });
      const inquiriesRaw = inquiriesRes.ok ? await inquiriesRes.json() : [];
      const inquiries = Array.isArray(inquiriesRaw) ? inquiriesRaw : [];
      const pendingRequests = inquiries.filter(inq => inq.status === 'PENDING').length;

      // Fetch Bookings (Confirmed Vendors)
      const bookingsRes = await fetch(`${API_BASE_URL}/api/bookings`, { headers });
      const bookingsRaw = bookingsRes.ok ? await bookingsRes.json() : [];
      const bookings = Array.isArray(bookingsRaw) ? bookingsRaw : [];
      const confirmedVendors = bookings.filter(b => b.status === 'CONFIRMED').length;

      // Budget
      let remainingBudget = null;
      if (upcomingEvent && upcomingEvent.budget) {
        remainingBudget = upcomingEvent.budget.remainingBudget ??
          (upcomingEvent.budget.totalBudget - (upcomingEvent.budget.totalAllocated ??
            (upcomingEvent.budget.items?.reduce((acc, item) => acc + item.amount, 0) || 0)));
      }

      // Recommended Vendors
      const vendorsRes = await fetch(`${API_BASE_URL}/api/vendors`, { headers });
      const vendorsRaw = vendorsRes.ok ? await vendorsRes.json() : [];
      const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];
      const recommendedVendors = vendors.slice(0, 3); // Take first 3 for now

      // Recent Activity
      const activity = [];
      inquiries.forEach(inq => {
        activity.push({
          id: `inq-${inq.id}`,
          text: `You sent an inquiry to ${inq.vendor?.businessName}`,
          date: new Date(inq.createdAt)
        });
      });
      bookings.forEach(b => {
        activity.push({
          id: `bkg-${b.id}`,
          text: `Booking confirmed for ${b.event?.title}`,
          date: new Date(b.createdAt)
        });
      });
      activity.sort((a, b) => b.date - a.date);

      setDashboardData({
        upcomingEvent,
        pendingRequests,
        confirmedVendors,
        remainingBudget,
        recommendedVendors,
        recentActivity: activity.slice(0, 5) // Top 5
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const { upcomingEvent, pendingRequests, confirmedVendors, remainingBudget, recommendedVendors, recentActivity } = dashboardData;
  const firstName = user?.organizerProfile?.firstName || user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Organizer';

  // Planning Progress
  const categories = ['Venue', 'Photography', 'Catering', 'Decoration', 'Makeup'];
  const requirements = upcomingEvent?.requirements || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Good Morning, {firstName}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Let's make your next event unforgettable.</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Upcoming Event</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '600', marginTop: '0.5rem', color: 'var(--primary-rose-dark)' }}>
            {upcomingEvent ? upcomingEvent.title : 'No upcoming event'}
          </span>
        </Card>
        
        <Card style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Pending Requests</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '0.5rem', color: 'var(--primary-rose-dark)' }}>
            {pendingRequests > 0 ? pendingRequests : 'No requests yet'}
          </span>
        </Card>
        
        <Card style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Confirmed Vendors</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '0.5rem', color: 'var(--primary-rose-dark)' }}>
            {confirmedVendors > 0 ? confirmedVendors : 'No confirmed vendors'}
          </span>
        </Card>
        
        <Card style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
            {remainingBudget !== null && remainingBudget < 0 ? 'Over Budget' : 'Remaining Budget'}
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '0.5rem', color: remainingBudget !== null && remainingBudget < 0 ? '#b91c1c' : 'var(--primary-rose-dark)' }}>
            {remainingBudget !== null ? `$${Math.abs(remainingBudget).toLocaleString()}` : 'Set a budget'}
          </span>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Upcoming Event Large Card */}
          <Card style={{ padding: '2rem', borderTop: '4px solid var(--primary-rose)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Upcoming Event Details</h2>
            {upcomingEvent ? (
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-rose-dark)', marginBottom: '0.5rem' }}>{upcomingEvent.title}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Date:</strong> {upcomingEvent.date ? new Date(upcomingEvent.date).toLocaleDateString() : 'TBD'}</div>
                  <div><strong>Location:</strong> {upcomingEvent.location || 'TBD'}</div>
                  <div><strong>Budget:</strong> {upcomingEvent.budget ? `$${upcomingEvent.budget.totalBudget}` : 'Not set'}</div>
                  <div><strong>Status:</strong> {upcomingEvent.status}</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No upcoming events</p>
                <Link to="/organizer/events/create"><Button variant="primary">Create Your First Event</Button></Link>
              </div>
            )}
          </Card>

          {/* Event Planning Progress & Requirements */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Planning Progress</h2>
            {upcomingEvent ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  {categories.map(cat => {
                    const req = requirements.find(r => r.category === cat || r.title === cat);
                    const isCompleted = req?.status === 'COMPLETED';
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>{cat}</span>
                        <span style={{ 
                          fontSize: '0.875rem', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '999px',
                          backgroundColor: isCompleted ? 'var(--success-sage)' : 'var(--primary-rose-tint)',
                          color: isCompleted ? '#fff' : 'var(--primary-rose-dark)'
                        }}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Requirements Checklist</h3>
                {requirements.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {requirements.map(req => (
                      <li key={req.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--surface-soft)', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{req.title}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.category || 'General'}</div>
                        </div>
                        <div style={{ color: req.status === 'COMPLETED' ? 'var(--success-sage)' : 'var(--text-secondary)' }}>
                          {req.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No vendor requirements added yet.</p>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                Create an event to start tracking your planning progress.
              </p>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Recommended Vendors */}
          <Card style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Recommended Vendors</h2>
              <Link to="/organizer/vendors" style={{ color: 'var(--primary-rose)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>View All</Link>
            </div>
            
            {recommendedVendors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recommendedVendors.map(vendor => (
                  <div key={vendor.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--card-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>
                      {vendor.businessName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{vendor.businessName}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{vendor.category?.name || 'Vendor'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                Vendor recommendations will appear here once you add event requirements.
              </p>
            )}
          </Card>

          {/* Recent Activity */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentActivity.map(act => (
                  <div key={act.id} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--primary-rose-tint)', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{act.text}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {act.date.toLocaleDateString()} at {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No recent activity.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
