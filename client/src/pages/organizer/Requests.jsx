import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Search } from 'lucide-react';

export const Requests = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_BASE_URL}/api/inquiries`, { headers });
      if (!res.ok) throw new Error('Failed to fetch requests');
      
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load your requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/inquiries/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to cancel request');
      }
      
      const updatedInquiry = await res.json();
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: updatedInquiry.status } : req));
      setActionMessage({ type: 'success', text: 'Request cancelled successfully.' });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Unable to cancel request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#D97706' };
      case 'RESPONDED': return { bg: '#E0E7FF', text: '#4338CA' };
      case 'DECLINED': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'CANCELLED': return { bg: '#F3F4F6', text: '#4B5563' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const filteredRequests = requests.filter(req => {
    const searchLower = searchQuery.toLowerCase();
    const vendorName = req.vendor?.businessName || '';
    const eventName = req.event?.title || '';
    
    const matchesSearch = 
      vendorName.toLowerCase().includes(searchLower) ||
      eventName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchRequests}>Try Again</Button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>You have no requests.</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Send inquiries to vendors to see them here.</p>
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
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Requests</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Track inquiries you've sent to vendors.</p>
        
        {actionMessage.text && (
          <div style={{ 
            color: actionMessage.type === 'error' ? 'var(--primary-rose-dark)' : '#15803D', 
            backgroundColor: actionMessage.type === 'error' ? 'var(--primary-rose-tint)' : '#DCFCE7', 
            padding: '1rem', 
            borderRadius: 'var(--radius-normal)', 
            marginBottom: '1.5rem', 
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {actionMessage.text}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <Input 
              placeholder="Search by vendor or event name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '3rem', width: '100%', backgroundColor: 'var(--card-white)' }}
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: '200px', backgroundColor: 'var(--card-white)', appearance: 'none' }}
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RESPONDED">Responded</option>
            <option value="DECLINED">Declined</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filteredRequests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(req => {
            const vendor = req.vendor;
            const event = req.event;
            const statusColors = getStatusColor(req.status);

            return (
              <Card key={req.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', '@media (min-width: 768px)': { flexDirection: 'row', alignItems: 'center' } }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.2rem', flexShrink: 0 }}>
                      {vendor?.businessName?.charAt(0) || 'V'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vendor?.businessName || 'Unknown Vendor'}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Requested on {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginLeft: 'calc(48px + 1rem)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      <strong>Event:</strong> {event?.title || 'Unknown Event'}
                    </div>
                    <div style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '20px', 
                      fontSize: '0.8rem', 
                      fontWeight: '600', 
                      backgroundColor: statusColors.bg, 
                      color: statusColors.text 
                    }}>
                      {req.status}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginLeft: 'calc(48px + 1rem)' }}>
                  <style>{`
                    @media (min-width: 768px) {
                      .req-actions { margin-left: 0 !important; }
                    }
                  `}</style>
                  <div className="req-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button variant="outline" onClick={() => navigate(`/organizer/vendors/${req.vendorId}`)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      View Vendor
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/organizer/events/${req.eventId}`)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      View Event
                    </Button>
                    {req.status === 'PENDING' && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleCancel(req.id)} 
                        disabled={actionLoading}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: '#DC2626', color: '#DC2626' }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--card-white)', borderRadius: 'var(--radius-large)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No matching requests found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try changing your search or filters.</p>
        </div>
      )}

    </div>
  );
};
