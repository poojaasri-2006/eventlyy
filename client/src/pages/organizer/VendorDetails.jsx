import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { ArrowLeft } from 'lucide-react';
import { VendorRating, VendorWebsiteLink } from '../../components/VendorRating';
import { VendorAuthenticitySection } from '../../components/VendorAuthenticitySection';
import { VendorReviewsSection } from '../../components/VendorReviewsSection';

export const VendorDetails = () => {
  const { id } = useParams();
  const { token } = useAuth();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authenticity state
  const [verificationData, setVerificationData] = useState(null);
  const [authenticityLoading, setAuthenticityLoading] = useState(false);
  const [refreshingAuthenticity, setRefreshingAuthenticity] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Shortlist and Inquiry state
  const [shortlists, setShortlists] = useState([]);
  const [events, setEvents] = useState([]);
  
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchAuthenticity = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshingAuthenticity(true);
      } else {
        setAuthenticityLoading(true);
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      const endpoint = isManualRefresh
        ? `${API_BASE_URL}/api/vendors/${id}/authenticity/refresh`
        : `${API_BASE_URL}/api/vendors/${id}/authenticity`;

      const method = isManualRefresh ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method, headers });

      if (res.ok) {
        const data = await res.json();
        setVerificationData(data);
      }
    } catch (authErr) {
      console.error('[Authenticity Fetch Error]', authErr);
    } finally {
      setAuthenticityLoading(false);
      setRefreshingAuthenticity(false);
    }
  };

  const handleOrganizerVerificationAction = async (actionType, reason, notes) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/vendors/${id}/authenticity/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ actionType, reason, notes })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Action failed');
      }

      const data = await res.json();
      setVerificationData(prev => ({
        ...prev,
        verification: data.verification
      }));
    } finally {
      setActionLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [vendorRes, shortlistsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vendors/${id}`, { headers }),
        fetch(`${API_BASE_URL}/api/shortlist`, { headers }),
        fetch(`${API_BASE_URL}/api/events`, { headers })
      ]);

      if (!vendorRes.ok) {
        if (vendorRes.status === 404) throw new Error('Vendor not found.');
        throw new Error('Unable to load vendor details.');
      }
      
      const [vendorData, shortlistsData, eventsData] = await Promise.all([
        vendorRes.json(),
        shortlistsRes.ok ? shortlistsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : []
      ]);

      setVendor(vendorData);
      setShortlists(shortlistsData);
      setEvents(eventsData);

      // Automatically fetch / run authenticity verification when opening View Vendor
      fetchAuthenticity(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load vendor details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const handleShortlist = async () => {
    if (!selectedEventId) {
      setActionError('Please select an event.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/shortlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          vendorId: id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error adding to shortlist');
      }

      const newShortlist = await res.json();
      setShortlists([...shortlists, newShortlist]);
      setShowShortlistModal(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInquiry = async () => {
    if (!selectedEventId) {
      setActionError('Please select an event.');
      return;
    }
    if (!inquiryMessage.trim()) {
      setActionError('Please enter a message.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          vendorId: id,
          message: inquiryMessage
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error sending inquiry');
      }

      setActionSuccess('Inquiry sent successfully!');
      setTimeout(() => setShowInquiryModal(false), 2000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !vendor) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>{error}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/organizer/vendors">
            <Button variant="outline">Back to Find Vendors</Button>
          </Link>
          <Button variant="primary" onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  const isShortlisted = shortlists.some(s => s.vendorId === id);

  const openModal = (type) => {
    setActionError('');
    setActionSuccess('');
    setSelectedEventId(events.length > 0 ? events[0].id : '');
    if (type === 'shortlist') setShowShortlistModal(true);
    if (type === 'inquiry') {
      setInquiryMessage('');
      setShowInquiryModal(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Link */}
      <div>
        <Link to="/organizer/vendors" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Back to Find Vendors
        </Link>
      </div>

      {/* Automatic Vendor Authenticity Assessment */}
      <VendorAuthenticitySection
        vendor={vendor}
        verificationData={verificationData}
        loading={authenticityLoading}
        onRefresh={() => fetchAuthenticity(true)}
        refreshing={refreshingAuthenticity}
        onPerformAction={handleOrganizerVerificationAction}
        actionLoading={actionLoading}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Card */}
          <Card style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
              {vendor.imageUrl ? (
                <img
                  src={vendor.imageUrl}
                  alt={vendor.businessName}
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--primary-rose-tint)' }}
                />
              ) : (
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '2rem', flexShrink: 0 }}>
                  {vendor.businessName.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.75rem' }}>{vendor.businessName}</h1>
                <div style={{ fontSize: '1rem', color: 'var(--primary-rose)', fontWeight: '500', marginTop: '0.25rem' }}>
                  {vendor.category?.name || 'Vendor'}
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  <VendorRating averageRating={vendor.averageRating} reviewCount={vendor.reviewCount} />
                  {(vendor.city || vendor.state || vendor.address) && (
                    <div>📍 Location: {[vendor.address, vendor.city, vendor.state, vendor.postalCode].filter(Boolean).join(', ')}</div>
                  )}
                  {vendor.phone && <div>📞 {vendor.phone}</div>}
                  {vendor.website && <VendorWebsiteLink website={vendor.website} />}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>About</h3>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
                {vendor.description || <span style={{ color: 'var(--text-secondary)' }}>Not provided</span>}
              </p>
            </div>
          </Card>

          {/* Services */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>Services</h2>
            {vendor.services && vendor.services.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vendor.services.map(service => (
                  <div key={service.id} style={{ padding: '1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{service.name}</h4>
                      {service.price && <span style={{ fontWeight: '600', color: 'var(--primary-rose-dark)' }}>${service.price}</span>}
                    </div>
                    {service.description && <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{service.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No services listed yet.</p>
            )}
          </Card>

          {/* Packages */}
          <Card style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-rose-dark)' }}>Packages</h2>
            {vendor.packages && vendor.packages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vendor.packages.map(pkg => (
                  <div key={pkg.id} style={{ padding: '1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{pkg.name}</h4>
                        {pkg.category && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-rose)', fontWeight: '600' }}>
                            {pkg.category.name}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.1rem' }}>${pkg.price}</span>
                    </div>
                    {pkg.description && <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{pkg.description}</p>}
                    {pkg.services && pkg.services.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                        {pkg.services.map(s => (
                          <span key={s.id} style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-soft)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                            ✓ {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No packages listed yet.</p>
            )}
          </Card>

          {/* Customer Reviews & Ratings */}
          <VendorReviewsSection vendorId={id} />
        </div>

        {/* Action Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Actions</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button 
                variant={isShortlisted ? "outline" : "primary"} 
                onClick={() => !isShortlisted && openModal('shortlist')}
                style={isShortlisted ? { backgroundColor: 'var(--success-sage)', color: 'white', borderColor: 'var(--success-sage)', width: '100%' } : { width: '100%' }}
              >
                {isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
              </Button>

              <Button 
                variant="outline" 
                onClick={() => openModal('inquiry')}
                style={{ width: '100%' }}
              >
                Send Inquiry
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Shortlist Modal */}
      {showShortlistModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Select Event to Shortlist</h3>
            
            {actionError && (
              <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {actionError}
              </div>
            )}

            {events.length > 0 ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Event</label>
                <select 
                  className="input" 
                  style={{ width: '100%', appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You must create an event before shortlisting vendors.</p>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowShortlistModal(false)} disabled={actionLoading}>Cancel</Button>
              {events.length > 0 && (
                <Button variant="primary" onClick={handleShortlist} disabled={actionLoading}>
                  {actionLoading ? 'Adding...' : 'Confirm'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ padding: '2rem', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Send Inquiry to {vendor.businessName}</h3>
            
            {actionError && (
              <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div style={{ color: '#fff', backgroundColor: 'var(--success-sage)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {actionSuccess}
              </div>
            )}

            {!actionSuccess && (
              <>
                {events.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Event</label>
                      <select 
                        className="input" 
                        style={{ width: '100%', appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={actionLoading}
                      >
                        {events.map(e => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Message</label>
                      <textarea
                        className="input"
                        placeholder="Tell the vendor about your needs..."
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        disabled={actionLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You must create an event before sending inquiries.</p>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <Button variant="outline" onClick={() => setShowInquiryModal(false)} disabled={actionLoading}>Cancel</Button>
                  {events.length > 0 && (
                    <Button variant="primary" onClick={handleSendInquiry} disabled={actionLoading}>
                      {actionLoading ? 'Sending...' : 'Send Inquiry'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <style>{`
        @media (min-width: 1024px) {
          .vendor-details-grid {
            grid-template-columns: 2fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
