import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Search, Send, CheckCircle2, MessageSquare, ArrowRight, X } from 'lucide-react';
import { VendorRating, VendorWebsiteLink, VendorWebsiteAssessmentRating } from '../../components/VendorRating';

export const Shortlist = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [shortlists, setShortlists] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('All');

  // Removal & action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Inquiry modal state
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [activeShortlistItem, setActiveShortlistItem] = useState(null);

  // Inquiry Form Fields
  const [inquiryEventId, setInquiryEventId] = useState('');
  const [inquiryEventDate, setInquiryEventDate] = useState('');
  const [inquiryLocation, setInquiryLocation] = useState('');
  const [inquiryBudget, setInquiryBudget] = useState('');
  const [inquiryRequiredServices, setInquiryRequiredServices] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');

  // Inquiry Submission States
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };

      const [shortlistsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/shortlist`, { headers }),
        fetch(`${API_BASE_URL}/api/events`, { headers })
      ]);

      if (!shortlistsRes.ok) throw new Error('Failed to fetch shortlist');

      const [shortlistsData, eventsData] = await Promise.all([
        shortlistsRes.json(),
        eventsRes.ok ? eventsRes.json() : []
      ]);

      setShortlists(shortlistsData);
      setEvents(eventsData);
    } catch (err) {
      console.error(err);
      setError('Unable to load your shortlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRemove = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vendor from your shortlist?')) return;

    setActionLoading(true);
    setActionError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/shortlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to remove shortlist item');
      }

      setShortlists(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      setActionError('Unable to remove vendor. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open modal & pre-fill details from event & vendor
  const handleOpenInquiryModal = (shortlistItem) => {
    setActiveShortlistItem(shortlistItem);
    setInquiryError('');
    setInquirySuccess('');

    // Pre-fill selected event or fall back to first available event
    const initialEventId = shortlistItem.eventId || (events.length > 0 ? events[0].id : '');
    setInquiryEventId(initialEventId);

    const selectedEv = events.find(e => e.id === initialEventId) || shortlistItem.event;
    if (selectedEv) {
      setInquiryEventDate(selectedEv.date ? new Date(selectedEv.date).toISOString().split('T')[0] : '');
      setInquiryLocation(selectedEv.location || '');
    } else {
      setInquiryEventDate('');
      setInquiryLocation('');
    }

    // Pre-fill default service from vendor category or primary service
    const vendor = shortlistItem.vendor;
    if (vendor?.category?.name) {
      setInquiryRequiredServices(vendor.category.name);
    } else if (vendor?.services && vendor.services.length > 0) {
      setInquiryRequiredServices(vendor.services[0].name);
    } else {
      setInquiryRequiredServices('');
    }

    setInquiryBudget('');
    setInquiryMessage('');
    setInquiryModalOpen(true);
  };

  // When organizer switches event inside the modal, update pre-filled date & location
  const handleEventChange = (newEventId) => {
    setInquiryEventId(newEventId);
    const selectedEv = events.find(e => e.id === newEventId);
    if (selectedEv) {
      setInquiryEventDate(selectedEv.date ? new Date(selectedEv.date).toISOString().split('T')[0] : '');
      setInquiryLocation(selectedEv.location || '');
    }
  };

  // Submit inquiry
  const handleSendInquiry = async (e) => {
    e.preventDefault();

    if (!inquiryEventId) {
      setInquiryError('Please select an event for this inquiry.');
      return;
    }

    if (!inquiryMessage.trim()) {
      setInquiryError('Please enter a message or details for the vendor.');
      return;
    }

    setSubmittingInquiry(true);
    setInquiryError('');
    setInquirySuccess('');

    // Construct full message with structured details
    const selectedEv = events.find(e => e.id === inquiryEventId);
    const detailsLines = [];
    if (selectedEv?.title) detailsLines.push(`Event: ${selectedEv.title}`);
    if (inquiryEventDate) detailsLines.push(`Date: ${inquiryEventDate}`);
    if (inquiryLocation) detailsLines.push(`Location: ${inquiryLocation}`);
    if (inquiryRequiredServices) detailsLines.push(`Required Services: ${inquiryRequiredServices}`);
    if (inquiryBudget) detailsLines.push(`Budget: ${inquiryBudget}`);

    const formattedMessage = detailsLines.length > 0
      ? `${inquiryMessage.trim()}\n\n---\nEvent Details:\n${detailsLines.join('\n')}`
      : inquiryMessage.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: inquiryEventId,
          vendorId: activeShortlistItem.vendorId,
          message: formattedMessage
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send inquiry.');
      }

      setInquirySuccess('Inquiry sent successfully!');

      // Update shortlists state with the new inquiry record so UI immediately switches to "Inquiry Sent"
      setShortlists(prev => prev.map(s => {
        if (s.id === activeShortlistItem.id || (s.vendorId === activeShortlistItem.vendorId && s.eventId === inquiryEventId)) {
          return {
            ...s,
            inquiry: data
          };
        }
        return s;
      }));

      // Close modal after brief success confirmation
      setTimeout(() => {
        setInquiryModalOpen(false);
        setActiveShortlistItem(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setInquiryError(err.message || 'Network error while sending inquiry.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const getVendorRating = (vendor) => {
    if (!vendor || !vendor.reviews || vendor.reviews.length === 0) return 0;
    const sum = vendor.reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / vendor.reviews.length;
  };

  const getStartingPrice = (vendor) => {
    if (!vendor) return null;
    const prices = [];
    if (vendor.packages && vendor.packages.length > 0) {
      prices.push(...vendor.packages.map(p => p.price));
    }
    if (vendor.services && vendor.services.length > 0) {
      prices.push(...vendor.services.filter(s => s.price).map(s => s.price));
    }
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const filteredShortlists = shortlists.filter(item => {
    const vendor = item.vendor;
    if (!vendor) return false;

    // Search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      vendor.businessName.toLowerCase().includes(searchLower) ||
      (vendor.category?.name || '').toLowerCase().includes(searchLower) ||
      (vendor.description || '').toLowerCase().includes(searchLower);

    // Event Filter
    const matchesEvent = eventFilter === 'All' || item.eventId === eventFilter;

    return matchesSearch && matchesEvent;
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  if (shortlists.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Your shortlist is empty.</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Explore the vendor marketplace and save vendors you like.</p>
        <Link to="/organizer/vendors">
          <Button variant="primary">Find Vendors</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Shortlist</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Contact vendors directly or review your saved event selections. ({shortlists.length} total)
        </p>

        {actionError && (
          <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {actionError}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <Input
              placeholder="Search shortlisted vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '3rem', width: '100%', backgroundColor: 'var(--card-white)' }}
            />
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="input"
            style={{ width: '250px', backgroundColor: 'var(--card-white)', appearance: 'none' }}
          >
            <option value="All">All Events</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredShortlists.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredShortlists.map(item => {
            const vendor = item.vendor;
            const rating = getVendorRating(vendor);
            const startingPrice = getStartingPrice(vendor);
            const event = item.event;
            const inquiry = item.inquiry;
            const hasInquiry = Boolean(inquiry);

            return (
              <Card key={item.id} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {vendor.imageUrl ? (
                      <img
                        src={vendor.imageUrl}
                        alt={vendor.businessName}
                        style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--primary-rose-tint)' }}
                      />
                    ) : (
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.25rem', flexShrink: 0 }}>
                        {vendor.businessName.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', rowGap: '0.2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vendor.businessName}</h3>
                        <VendorWebsiteAssessmentRating assessment={vendor.websiteAssessment} />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-rose)', fontWeight: '500', marginTop: '0.15rem' }}>
                        {vendor.category?.name || 'Vendor'}
                      </div>
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    {event && (
                      <div style={{ marginBottom: '0.65rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--surface-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>Event:</strong> {event.title}</span>
                      </div>
                    )}

                    {/* Inquiry Status Badge if inquiry already sent */}
                    {hasInquiry && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: inquiry.status === 'ACCEPTED' ? '#edf7ed' : inquiry.status === 'DECLINED' ? '#fdebee' : 'var(--primary-rose-tint)',
                        color: inquiry.status === 'ACCEPTED' ? '#2e7d32' : inquiry.status === 'DECLINED' ? '#c62828' : 'var(--primary-rose-dark)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-normal)',
                        marginBottom: '0.75rem',
                        fontSize: '0.82rem',
                        fontWeight: '600'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={14} /> Inquiry {inquiry.status || 'SENT'}
                        </span>
                        <Link to="/organizer/requests" style={{ color: 'inherit', textDecoration: 'underline', fontSize: '0.78rem' }}>
                          View Details
                        </Link>
                      </div>
                    )}

                    <VendorRating averageRating={rating} reviewCount={vendor.reviews?.length || 0} style={{ marginBottom: '0.4rem' }} />

                    {vendor.website && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <VendorWebsiteLink website={vendor.website} />
                      </div>
                    )}

                    {startingPrice !== null && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <strong>Starting at:</strong> ${startingPrice}
                      </div>
                    )}

                    {(vendor.city || vendor.state || vendor.address) && (
                      <div style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        📍 {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ')}
                      </div>
                    )}

                    <p style={{ margin: '0.5rem 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {vendor.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Actions on Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {hasInquiry ? (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/organizer/requests')}
                      style={{
                        width: '100%',
                        backgroundColor: '#edf7ed',
                        borderColor: '#c8e6c9',
                        color: '#2e7d32',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <CheckCircle2 size={16} /> Inquiry Sent ({inquiry.status})
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleOpenInquiryModal(item)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Send size={15} /> Send Inquiry
                    </Button>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/organizer/vendors/${vendor.id}`)}
                      style={{ flex: 1, fontSize: '0.85rem' }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRemove(item.id)}
                      disabled={actionLoading}
                      style={{ flex: 1, borderColor: 'var(--primary-rose)', color: 'var(--primary-rose-dark)', fontSize: '0.85rem' }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--card-white)', borderRadius: 'var(--radius-large)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No matching vendors found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try changing your search or filters.</p>
        </div>
      )}

      {/* Send Inquiry Modal */}
      {inquiryModalOpen && activeShortlistItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <Card style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>
                  Send Inquiry
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--primary-rose-dark)', fontWeight: '500', fontSize: '0.95rem' }}>
                  To: {activeShortlistItem.vendor?.businessName}
                </p>
              </div>
              <button
                onClick={() => setInquiryModalOpen(false)}
                disabled={submittingInquiry}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {inquiryError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {inquiryError}
              </div>
            )}

            {inquirySuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 size={48} color="#2e7d32" style={{ marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{inquirySuccess}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  The vendor has been notified and will reply to your request.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Event Selection */}
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    Select Event *
                  </label>
                  {events.length > 0 ? (
                    <select
                      className="input"
                      value={inquiryEventId}
                      onChange={(e) => handleEventChange(e.target.value)}
                      disabled={submittingInquiry}
                      required
                      style={{ appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Please create an event first before sending an inquiry.
                    </p>
                  )}
                </div>

                {/* 2. Date and Location (2 columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      Event Date
                    </label>
                    <Input
                      type="date"
                      value={inquiryEventDate}
                      onChange={(e) => setInquiryEventDate(e.target.value)}
                      disabled={submittingInquiry}
                      style={{ backgroundColor: 'var(--surface-soft)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      Event Location
                    </label>
                    <Input
                      placeholder="e.g. Hyderabad, City Center"
                      value={inquiryLocation}
                      onChange={(e) => setInquiryLocation(e.target.value)}
                      disabled={submittingInquiry}
                      style={{ backgroundColor: 'var(--surface-soft)' }}
                    />
                  </div>
                </div>

                {/* 3. Required Services & Budget Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      Required Services
                    </label>
                    <Input
                      placeholder="e.g. Photography, Catering, Decor"
                      value={inquiryRequiredServices}
                      onChange={(e) => setInquiryRequiredServices(e.target.value)}
                      disabled={submittingInquiry}
                      style={{ backgroundColor: 'var(--surface-soft)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      Budget Range
                    </label>
                    <Input
                      placeholder="e.g. $1,000 - $2,500"
                      value={inquiryBudget}
                      onChange={(e) => setInquiryBudget(e.target.value)}
                      disabled={submittingInquiry}
                      style={{ backgroundColor: 'var(--surface-soft)' }}
                    />
                  </div>
                </div>

                {/* 4. Message / Additional Requirements */}
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    Message or Requirements *
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Tell the vendor about your event needs, guest count, schedule, or specific questions..."
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    disabled={submittingInquiry}
                    required
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setInquiryModalOpen(false)}
                    disabled={submittingInquiry}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submittingInquiry || events.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={15} />
                    {submittingInquiry ? 'Sending Inquiry...' : 'Submit Inquiry'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

    </div>
  );
};
