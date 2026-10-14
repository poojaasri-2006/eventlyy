import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Search,
  AlertCircle,
  Eye,
  Check,
  Send
} from 'lucide-react';

export const VendorRequests = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request & Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quote Modal states
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDetails, setQuoteDetails] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Action status feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/vendor/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to fetch vendor requests');
      }

      const data = await res.json();
      setRequests(data);

      // If URL has :id, open that request's details
      if (paramId) {
        const target = data.find(r => r.id === paramId);
        if (target) {
          setSelectedRequest(target);
          setIsDetailModalOpen(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [token, paramId]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`${API_BASE_URL}/api/vendor/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to update request to ${newStatus}`);
      }

      const updated = await res.json();

      setActionSuccess(`Request ${newStatus.toLowerCase()} successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);

      // Update local state
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: updated.status } : r));

      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => ({ ...prev, status: updated.status }));
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openQuoteModal = (request) => {
    setSelectedRequest(request);
    setQuoteAmount('');
    setQuoteDetails('');
    setQuoteError(null);
    setIsDetailModalOpen(false);
    setIsQuoteModalOpen(true);
  };

  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!quoteAmount || isNaN(quoteAmount) || parseFloat(quoteAmount) <= 0) {
      setQuoteError('Please enter a valid quote amount.');
      return;
    }

    if (!quoteDetails.trim()) {
      setQuoteError('Please provide quote details and specifications.');
      return;
    }

    try {
      setSubmittingQuote(true);
      setQuoteError(null);

      const res = await fetch(`${API_BASE_URL}/api/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inquiryId: selectedRequest.id,
          totalAmount: parseFloat(quoteAmount),
          details: quoteDetails.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit quote');
      }

      const createdQuote = await res.json();

      setActionSuccess(`Quote of $${parseFloat(quoteAmount).toLocaleString()} submitted to organizer!`);
      setTimeout(() => setActionSuccess(null), 3000);

      setIsQuoteModalOpen(false);

      // Automatically mark inquiry as RESPONDED or update quote
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, quote: createdQuote } : r));
      fetchRequests();
    } catch (err) {
      setQuoteError(err.message);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // Status filter
    if (statusFilter === 'PENDING' && req.status !== 'PENDING') return false;
    if (statusFilter === 'ACCEPTED' && req.status !== 'ACCEPTED' && req.status !== 'RESPONDED') return false;
    if (statusFilter === 'DECLINED' && req.status !== 'DECLINED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const eventTitle = req.event?.title?.toLowerCase() || '';
      const organizerName = `${req.event?.organizer?.firstName || ''} ${req.event?.organizer?.lastName || ''}`.toLowerCase();
      const location = req.event?.location?.toLowerCase() || '';
      const msg = req.message?.toLowerCase() || '';
      return eventTitle.includes(q) || organizerName.includes(q) || location.includes(q) || msg.includes(q);
    }

    return true;
  });

  // KPI counts
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const acceptedCount = requests.filter(r => r.status === 'ACCEPTED' || r.status === 'RESPONDED').length;
  const declinedCount = requests.filter(r => r.status === 'DECLINED').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <Clock size={12} /> Pending Review
          </span>
        );
      case 'ACCEPTED':
        return (
          <span style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case 'RESPONDED':
        return (
          <span style={{
            backgroundColor: '#e0e7ff',
            color: '#4338ca',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <FileText size={12} /> Quote Sent
          </span>
        );
      case 'DECLINED':
        return (
          <span style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <XCircle size={12} /> Declined
          </span>
        );
      default:
        return (
          <span style={{
            backgroundColor: 'var(--surface-soft)',
            color: 'var(--text-secondary)',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {status}
          </span>
        );
    }
  };

  if (loading && !requests.length) return <LoadingState />;

  if (error && !requests.length) {
    return (
      <Card style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1.25rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchRequests}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Requests & Inquiries</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Review event inquiries sent to you by organizers, accept opportunities, and submit quotes.
        </p>
      </div>

      {actionSuccess && (
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
          <Check size={18} /> {actionSuccess}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
          <AlertCircle size={18} /> {actionError}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-rose)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>All Requests</p>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem' }}>{totalCount}</h3>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Pending Action</p>
          <h3 style={{ margin: 0, color: '#b45309', fontSize: '1.6rem' }}>{pendingCount}</h3>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Accepted / Active</p>
          <h3 style={{ margin: 0, color: '#047857', fontSize: '1.6rem' }}>{acceptedCount}</h3>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Declined</p>
          <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '1.6rem' }}>{declinedCount}</h3>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'ACCEPTED', label: `Accepted (${acceptedCount})` },
              { key: 'DECLINED', label: `Declined (${declinedCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: statusFilter === tab.key ? '1px solid var(--primary-rose)' : '1px solid #e5e7eb',
                  backgroundColor: statusFilter === tab.key ? 'var(--primary-rose-tint)' : '#fff',
                  color: statusFilter === tab.key ? 'var(--primary-rose-dark)' : 'var(--text-secondary)',
                  fontWeight: statusFilter === tab.key ? '600' : '400',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by event, organizer, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem 0.5rem 2.4rem',
                border: '1px solid var(--surface-soft)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                backgroundColor: '#fff'
              }}
            />
          </div>

        </div>
      </Card>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(req => {
            const organizer = req.event?.organizer;
            const organizerName = organizer ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() : 'Event Organizer';
            const eventDate = req.event?.date ? new Date(req.event.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Date TBD';
            const requestDate = new Date(req.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' });

            return (
              <Card key={req.id} style={{ padding: '1.5rem', transition: 'box-shadow 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>
                        {req.event?.title || 'Event Inquiry'}
                      </h3>
                      {renderStatusBadge(req.status)}
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Requested by <strong>{organizerName}</strong> on {requestDate}
                    </p>
                  </div>

                  {/* Quote quick status if already submitted */}
                  {req.quote && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', fontWeight: '500' }}>Quote Sent</span>
                      <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>${req.quote.totalAmount.toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                {/* Event Metadata Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-soft)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={15} style={{ color: 'var(--primary-rose)' }} />
                    <span>{eventDate}</span>
                  </div>

                  {req.event?.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{req.event.location}</span>
                    </div>
                  )}

                  {organizer?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{organizer.phone}</span>
                    </div>
                  )}

                  {organizer?.user?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{organizer.user.email}</span>
                    </div>
                  )}
                </div>

                {/* Organizer Message */}
                <div style={{ marginBottom: '1.25rem', backgroundColor: '#fafafa', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #f3f4f6' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Message from Organizer:
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {req.message}
                  </p>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(req);
                      setIsDetailModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                  >
                    <Eye size={15} /> View Full Details
                  </Button>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Pending Action Buttons */}
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(req.id, 'DECLINED')}
                          style={{
                            backgroundColor: '#fff',
                            border: '1px solid #fee2e2',
                            color: '#ef4444',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <XCircle size={15} /> Decline
                        </button>

                        <Button
                          variant="primary"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                        >
                          <CheckCircle2 size={15} /> Accept Request
                        </Button>
                      </>
                    )}

                    {/* Accepted / Actionable Quote Button */}
                    {(req.status === 'ACCEPTED' || req.status === 'RESPONDED') && (
                      req.quote ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/vendor/requests/${req.id}/quote`)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                          >
                            <DollarSign size={14} /> View / Edit Quote
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => navigate(`/vendor/requests/${req.id}/quote`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                        >
                          <DollarSign size={15} /> Prepare Quote
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Inbox size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No requests found</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {statusFilter !== 'ALL' || searchQuery
              ? 'No requests match your current filters or search term.'
              : 'You have not received any inquiries yet. Ensure your services and profile are complete to attract organizers.'}
          </p>
        </Card>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Inquiry: ${selectedRequest.event?.title || 'Event Details'}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Status:</span>
                <div style={{ marginTop: '0.2rem' }}>{renderStatusBadge(selectedRequest.status)}</div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Received on {new Date(selectedRequest.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Event Summary */}
            <div style={{ backgroundColor: '#fafafa', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #f3f4f6' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Event Details</h4>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <strong>Event:</strong> {selectedRequest.event?.title}
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <strong>Date:</strong> {selectedRequest.event?.date ? new Date(selectedRequest.event.date).toLocaleDateString() : 'To be determined'}
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <strong>Location:</strong> {selectedRequest.event?.location || 'Not specified'}
              </p>
              {selectedRequest.event?.description && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {selectedRequest.event.description}
                </p>
              )}
            </div>

            {/* Organizer Contact Details */}
            <div style={{ backgroundColor: '#fafafa', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #f3f4f6' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Organizer Contact</h4>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <strong>Name:</strong> {selectedRequest.event?.organizer ? `${selectedRequest.event.organizer.firstName || ''} ${selectedRequest.event.organizer.lastName || ''}` : 'Organizer'}
              </p>
              {selectedRequest.event?.organizer?.phone && (
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Phone:</strong> {selectedRequest.event.organizer.phone}
                </p>
              )}
              {selectedRequest.event?.organizer?.user?.email && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Email:</strong> {selectedRequest.event.organizer.user.email}
                </p>
              )}
            </div>

            {/* Inquiry Message */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Organizer Request Note</h4>
              <div style={{ backgroundColor: '#fff', border: '1px solid var(--surface-soft)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {selectedRequest.message}
              </div>
            </div>

            {/* Event Requirements */}
            {selectedRequest.event?.requirements && selectedRequest.event.requirements.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Event Requirements Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {selectedRequest.event.requirements.map(req => (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', backgroundColor: '#fafafa', padding: '0.4rem 0.65rem', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--primary-rose)' }}>•</span>
                      <strong>{req.title}</strong>
                      {req.category && <span style={{ color: 'var(--text-secondary)' }}>({req.category})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quote details if exists */}
            {selectedRequest.quote && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', color: '#166534', fontSize: '0.95rem' }}>Submitted Quote Details</h4>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#15803d' }}>
                  <strong>Total Amount:</strong> ${selectedRequest.quote.totalAmount.toLocaleString()}
                </p>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Status:</strong> {selectedRequest.quote.status}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {selectedRequest.quote.details}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem' }}>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>

              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'DECLINED')}
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid #fee2e2',
                      color: '#ef4444',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem 0.9rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Decline
                  </button>
                  <Button variant="primary" onClick={() => handleUpdateStatus(selectedRequest.id, 'ACCEPTED')}>
                    Accept Request
                  </Button>
                </>
              )}

              {selectedRequest.status === 'ACCEPTED' && !selectedRequest.quote && (
                <Button variant="primary" onClick={() => navigate(`/vendor/requests/${selectedRequest.id}/quote`)}>
                  Prepare Formal Quote
                </Button>
              )}

              {selectedRequest.quote && (
                <Button variant="outline" onClick={() => navigate(`/vendor/requests/${selectedRequest.id}/quote`)}>
                  View / Edit Quote (${selectedRequest.quote.totalAmount})
                </Button>
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* Prepare Quote Modal */}
      {selectedRequest && (
        <Modal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          title={`Prepare Quote: ${selectedRequest.event?.title || 'Event'}`}
        >
          <form onSubmit={handleSendQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {quoteError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {quoteError}
              </div>
            )}

            <div style={{ backgroundColor: '#fafafa', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', border: '1px solid #f3f4f6' }}>
              <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                <strong>Organizer:</strong> {selectedRequest.event?.organizer ? `${selectedRequest.event.organizer.firstName || ''} ${selectedRequest.event.organizer.lastName || ''}` : 'Organizer'}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                <strong>Inquiry Message:</strong> "{selectedRequest.message}"
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Quote Total Amount ($) *
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 1500"
                  value={quoteAmount}
                  onChange={e => setQuoteAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.25rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Quote Details & Deliverables *
              </label>
              <textarea
                rows="5"
                required
                placeholder="Itemize the services, deliverables, timeline, and terms included in this quote..."
                value={quoteDetails}
                onChange={e => setQuoteDetails(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" type="button" onClick={() => setIsQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submittingQuote} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Send size={15} /> {submittingQuote ? 'Submitting...' : 'Send Quote'}
              </Button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
};
