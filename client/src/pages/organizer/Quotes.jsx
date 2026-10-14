import API_BASE_URL from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Search } from 'lucide-react';

export const Quotes = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const loadQuotes = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/quotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to fetch quotes');
    return data;
  }, [token]);

  const fetchQuotes = useCallback(async () => {
    try {
      setQuotes(await loadQuotes());
      setError(null);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Unable to load quotes.');
    } finally {
      setLoading(false);
    }
  }, [loadQuotes]);

  useEffect(() => {
    let active = true;
    loadQuotes()
      .then((data) => {
        if (active) {
          setQuotes(data);
          setError(null);
        }
      })
      .catch((fetchError) => {
        console.error(fetchError);
        if (active) setError('Unable to load quotes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') fetchQuotes();
    };
    const intervalId = window.setInterval(refreshWhenActive, 30000);
    window.addEventListener('focus', refreshWhenActive);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenActive);
    };
  }, [fetchQuotes, loadQuotes]);

  const refreshQuotes = () => {
    setLoading(true);
    setError(null);
    fetchQuotes();
  };

  const handleUpdateStatus = async (id, status) => {
    const actionText = status === 'ACCEPTED' ? 'accept' : 'decline';
    if (!window.confirm(`Are you sure you want to ${actionText} this quote?`)) return;
    
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/quotes/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Failed to ${actionText} quote`);
      }
      
      const updatedQuote = await res.json();
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: updatedQuote.status } : q));
      await fetchQuotes();
      let successText = status === 'REJECTED'
        ? 'Quote declined successfully.'
        : 'Quote accepted and booking created successfully.';
      if (status === 'ACCEPTED') {
        const quote = quotes.find((item) => item.id === id);
        const eventId = quote?.inquiry?.event?.id;
        if (eventId) {
          try {
            const budgetResponse = await fetch(`${API_BASE_URL}/api/events/${eventId}/budget`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const budget = await budgetResponse.json().catch(() => null);
            if (!budgetResponse.ok) {
              throw new Error(budget?.message || `Budget refresh failed (HTTP ${budgetResponse.status}).`);
            }
            if (budget) {
              successText += ` Booked: ${formatAmount(budget.confirmedBookingTotal || 0)}; remaining: ${formatAmount(budget.remainingBudget || 0)}.`;
            }
          } catch (budgetError) {
            console.error('[Quote Decision Budget Refresh Error]', budgetError);
            successText += ` The booking succeeded, but the budget summary could not be refreshed: ${budgetError.message}`;
          }
        }
      }
      setActionMessage({
        type: successText.includes('could not be refreshed') ? 'warning' : 'success',
        text: successText
      });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || `Unable to ${actionText} quote.` });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#D97706' };
      case 'ACCEPTED': return { bg: '#DCFCE7', text: '#15803D' };
      case 'REJECTED': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const searchLower = searchQuery.toLowerCase();
    const vendorName = q.vendor?.businessName || '';
    const eventName = q.inquiry?.event?.title || '';
    
    const matchesSearch = 
      vendorName.toLowerCase().includes(searchLower) ||
      eventName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={refreshQuotes}>Try Again</Button>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>You have no quotes.</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Vendors will send quotes in response to your inquiries.</p>
        <Link to="/organizer/requests">
          <Button variant="primary">View Requests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Quotes</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Review and manage pricing quotes from vendors.</p>
        
        {actionMessage.text && (
          <div style={{ 
            color: actionMessage.type === 'error' ? 'var(--primary-rose-dark)' : actionMessage.type === 'warning' ? '#92400e' : '#15803D', 
            backgroundColor: actionMessage.type === 'error' ? 'var(--primary-rose-tint)' : actionMessage.type === 'warning' ? '#FEF3C7' : '#DCFCE7', 
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
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Declined</option>
          </select>
          <Button variant="outline" onClick={refreshQuotes} disabled={loading || actionLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* List */}
      {filteredQuotes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredQuotes.map(quote => {
            const vendor = quote.vendor;
            const inquiry = quote.inquiry;
            const event = inquiry?.event;
            const statusColors = getStatusColor(quote.status);

            return (
              <Card key={quote.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.5rem', '@media (min-width: 1024px)': { flexDirection: 'row', alignItems: 'flex-start' } }}>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.2rem', flexShrink: 0 }}>
                      {vendor?.businessName?.charAt(0) || 'V'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vendor?.businessName || 'Unknown Vendor'}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Received on {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Event</div>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{event?.title || 'Unknown Event'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Amount</div>
                      <div style={{ fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.1rem' }}>${quote.totalAmount}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status</div>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: '600', 
                        backgroundColor: statusColors.bg, 
                        color: statusColors.text 
                      }}>
                        {quote.status === 'REJECTED' ? 'Declined' : quote.status}
                      </span>
                    </div>
                  </div>

                  {quote.details && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Details</div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{quote.details}</p>
                    </div>
                  )}
                  
                  {inquiry?.message && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Original Inquiry</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{inquiry.message}"</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '150px' }}>
                  <Button variant="outline" onClick={() => navigate(`/organizer/vendors/${quote.vendorId}`)} style={{ width: '100%', fontSize: '0.9rem' }}>
                    View Vendor
                  </Button>
                  
                  {event && (
                    <Button variant="outline" onClick={() => navigate(`/organizer/events/${event.id}`)} style={{ width: '100%', fontSize: '0.9rem' }}>
                      View Event
                    </Button>
                  )}

                  {quote.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="primary" 
                        onClick={() => handleUpdateStatus(quote.id, 'ACCEPTED')} 
                        disabled={actionLoading}
                        style={{ width: '100%', fontSize: '0.9rem', backgroundColor: '#15803D', borderColor: '#15803D' }}
                      >
                        Accept Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(quote.id, 'REJECTED')} 
                        disabled={actionLoading}
                        style={{ width: '100%', fontSize: '0.9rem', borderColor: '#DC2626', color: '#DC2626' }}
                      >
                        Decline Quote
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--card-white)', borderRadius: 'var(--radius-large)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No matching quotes found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try changing your search or filters.</p>
        </div>
      )}

      <style>{`
        @media (min-width: 1024px) {
          .quote-actions-col {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
};
