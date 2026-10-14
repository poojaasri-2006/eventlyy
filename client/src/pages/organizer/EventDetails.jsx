import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ArrowLeft } from 'lucide-react';

export const EventDetails = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch Event Details
        const eventRes = await fetch(`${API_BASE_URL}/api/events/${id}`, { headers });
        if (!eventRes.ok) {
          if (eventRes.status === 404) throw new Error('Event not found.');
          throw new Error('Unable to load event.');
        }
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch Budget Details
        const budgetRes = await fetch(`${API_BASE_URL}/api/events/${id}/budget`, { headers });
        if (budgetRes.ok) {
          const budgetData = await budgetRes.json();
          setBudget(budgetData);
        }

      } catch (err) {
        console.error(err);
        setError(err.message || 'Unable to load event.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, token]);

  if (loading) return <LoadingState />;

  if (error || !event) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>{error}</p>
        <Link to="/organizer/events">
          <Button variant="primary">Back to My Events</Button>
        </Link>
      </div>
    );
  }

  // Parse custom description format "Event Type: X \n Expected Guests: Y \n\n description"
  let parsedType = 'Event';
  let parsedGuests = 'Not specified';
  let cleanDescription = event.description || '';

  if (cleanDescription.includes('Event Type:')) {
    const lines = cleanDescription.split('\n');
    parsedType = lines[0].replace('Event Type: ', '').trim();
    if (lines[1] && lines[1].includes('Expected Guests:')) {
      parsedGuests = lines[1].replace('Expected Guests: ', '').trim();
    }
    cleanDescription = lines.slice(2).join('\n').trim();
  }

  const requirements = event.requirements || [];
  const shortlists = event.shortlists || [];
  const inquiries = event.inquiries || [];
  const bookings = event.bookings || [];

  // Connected Vendors
  const connectedVendorsMap = new Map();
  inquiries.forEach(inq => {
    if (inq.vendor) {
      connectedVendorsMap.set(inq.vendor.id, {
        vendor: inq.vendor,
        status: inq.status,
        type: 'Inquiry'
      });
    }
  });

  const connectedVendors = Array.from(connectedVendorsMap.values());

  const spentAmount = budget?.totalAllocated ??
    ((budget?.items?.reduce((sum, item) => sum + item.amount, 0) || 0) + (budget?.confirmedBookingTotal || 0));
  const remainingBudget = budget?.remainingBudget ?? (budget ? budget.totalBudget - spentAmount : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <Link to="/organizer/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Back to My Events
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="outline" onClick={() => navigate(`/organizer/events/${id}/edit`)}>Edit Event</Button>
            <Button variant="primary" onClick={() => navigate('/organizer/vendors')}>Find Vendors</Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Overview */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>Event Overview</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Event Type</div>
                <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>{parsedType}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Date</div>
                <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>{event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Location</div>
                <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>{event.location || 'TBD'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Expected Guests</div>
                <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>{parsedGuests}</div>
              </div>
            </div>

            {cleanDescription && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Description</div>
                <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>{cleanDescription}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>{requirements.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Requirements</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>{shortlists.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shortlisted</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>{inquiries.filter(i => i.status === 'PENDING').length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Requests</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>{bookings.filter(b => b.status === 'CONFIRMED').length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confirmed Bookings</div>
              </div>
            </div>
          </Card>

          {/* Requirements Section */}
          <Card style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-rose-dark)' }}>Requirements</h2>
            </div>

            {requirements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requirements.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{req.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{req.category || 'General'}</div>
                    </div>
                    <StatusBadge status={req.status || 'PENDING'} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No requirements added yet.</p>
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Budget Section */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>Budget Overview</h2>
            
            {budget ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Budget</span>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>${budget.totalBudget}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Amount Spent</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary-rose-dark)' }}>${spentAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {remainingBudget < 0 ? 'Over budget' : 'Remaining'}
                  </span>
                  <span style={{ fontWeight: '600', color: remainingBudget < 0 ? '#b91c1c' : 'var(--success-sage)' }}>
                    ${Math.abs(remainingBudget)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No budget added yet.</p>
              </div>
            )}
          </Card>

          {/* Vendors Section */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>Connected Vendors</h2>
            
            {connectedVendors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {connectedVendors.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>
                      {item.vendor.businessName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{item.vendor.businessName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Status: {item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No vendors connected to this event yet.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <style>{`
        @media (min-width: 1024px) {
          .event-details-grid {
            grid-template-columns: 2fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
