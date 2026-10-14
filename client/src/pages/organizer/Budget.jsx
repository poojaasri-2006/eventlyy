import API_BASE_URL from '../../config';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { 
  DollarSign, 
  PieChart, 
  Receipt, 
  CheckCircle2, 
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';

export const Budget = () => {
  const { token } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [budget, setBudget] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [token]);

  // Fetch budget when selectedEventId changes
  const fetchBudget = async () => {
    if (!selectedEventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/events/${selectedEventId}/budget`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch budget');
      const data = await res.json();
      setBudget(data);
      setTotalBudgetInput(data.totalBudget !== undefined && data.totalBudget !== null ? data.totalBudget.toString() : '0');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
    // eslint-disable-next-line
  }, [selectedEventId, token]);

  const handleUpdateTotal = async () => {
    try {
      const val = parseFloat(totalBudgetInput);
      if (isNaN(val) || val < 0) return alert('Please enter a valid non-negative budget amount');
      
      setUpdatingBudget(true);
      setEditSuccess('');
      const res = await fetch(`${API_BASE_URL}/api/events/${selectedEventId}/budget`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ totalBudget: val })
      });
      if (!res.ok) throw new Error('Failed to update total budget');
      const updated = await res.json();
      setBudget(updated);
      setEditSuccess('Total budget updated successfully');
      setTimeout(() => setEditSuccess(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingBudget(false);
    }
  };

  // Calculations
  const { totalAllocated, remaining, expenses } = useMemo(() => {
    if (!budget) return { totalAllocated: 0, remaining: 0, expenses: [] };
    const alloc = budget.totalAllocated ?? (budget.confirmedBookingTotal || 0);
    const rem = (budget.totalBudget || 0) - alloc;
    return {
      totalAllocated: alloc,
      remaining: rem,
      expenses: budget.expenses || []
    };
  }, [budget]);

  const percentageUsed = budget?.totalBudget 
    ? Math.min(100, Math.max(0, (totalAllocated / budget.totalBudget) * 100)) 
    : 0;

  if (loading && !events.length) return <LoadingState />;
  
  if (events.length === 0) {
    return (
      <Card style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <PieChart size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>No Events Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You need to create an event first before you can manage a budget.</p>
      </Card>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header and Event Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Event Budget Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Automatically tracks expenses and deductions from confirmed vendor bookings.
          </p>
        </div>
        
        <div style={{ minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Event</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ 
                flex: 1,
                padding: '0.65rem 0.9rem', 
                border: '1px solid var(--surface-soft)', 
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                backgroundColor: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.95rem'
              }}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchBudget} title="Refresh budget data" style={{ padding: '0.65rem' }}>
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
          <Button variant="primary" onClick={fetchBudget}>Try Again</Button>
        </Card>
      ) : loading && events.length ? (
        <LoadingState />
      ) : budget ? (
        <>
          {/* Top 3 Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Total Budget Card */}
            <Card style={{ padding: '1.5rem', borderTop: '4px solid var(--primary-rose)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Total Budget</span>
                <DollarSign size={20} color="var(--primary-rose)" />
              </div>
              <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '2rem' }}>
                ₹{(budget.totalBudget || 0).toLocaleString()}
              </h2>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="number"
                  min="0"
                  step="1000"
                  value={totalBudgetInput}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  placeholder="Set budget..."
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem 0.75rem', 
                    border: '1px solid var(--surface-soft)', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <Button variant="primary" onClick={handleUpdateTotal} disabled={updatingBudget} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
                  {updatingBudget ? 'Saving...' : 'Set Budget'}
                </Button>
              </div>
              {editSuccess && (
                <span style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.4rem', display: 'block' }}>
                  {editSuccess}
                </span>
              )}
            </Card>

            {/* Allocated & Booked Card */}
            <Card style={{ padding: '1.5rem', borderTop: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Allocated &amp; Booked</span>
                <Receipt size={20} color="#6366f1" />
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '2rem' }}>
                ₹{totalAllocated.toLocaleString()}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
                {expenses.length} confirmed {expenses.length === 1 ? 'vendor booking' : 'vendor bookings'}
              </p>
              
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: percentageUsed > 100 ? '#ef4444' : '#6366f1', 
                    width: `${percentageUsed}%`,
                    transition: 'width 0.3s ease'
                  }} 
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                {percentageUsed.toFixed(1)}% of total budget spent
              </p>
            </Card>

            {/* Remaining Budget Card */}
            <Card style={{ padding: '1.5rem', borderTop: `4px solid ${remaining < 0 ? '#ef4444' : '#10b981'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Remaining Budget</span>
                <DollarSign size={20} color={remaining < 0 ? '#ef4444' : '#10b981'} />
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: remaining < 0 ? '#ef4444' : 'var(--text-primary)', fontSize: '2rem' }}>
                ₹{remaining.toLocaleString()}
              </h2>
              <p style={{ fontSize: '0.85rem', color: remaining < 0 ? '#dc2626' : 'var(--text-secondary)', margin: 0 }}>
                {remaining < 0 
                  ? `Over budget by ₹${Math.abs(remaining).toLocaleString()}` 
                  : `Available for further vendor bookings`}
              </p>
            </Card>
          </div>

          {budget.overBudget && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '0.9rem 1.25rem',
              borderRadius: 'var(--radius-normal)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              ⚠️ Warning: Confirmed bookings exceed your saved event budget by ₹{Math.abs(remaining).toLocaleString()}.
            </div>
          )}

          {/* Section 1: Budget Breakdown / Spending History */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary-rose-dark)' }}>
                  Budget Breakdown &amp; Spending List
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Expenses automatically populated from confirmed vendor quotes and bookings
                </p>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--surface-soft)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)' }}>
                {expenses.length} Confirmed {expenses.length === 1 ? 'Expense' : 'Expenses'}
              </span>
            </div>
            
            {expenses.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--surface-soft)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Expense / Service</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Vendor</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Event</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Date Confirmed</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Deduction Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid var(--surface-soft)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {exp.expenseName}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-primary)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building2 size={15} style={{ color: 'var(--primary-rose)' }} />
                            {exp.vendorName}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {exp.eventName}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {exp.bookingDate ? new Date(exp.bookingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary-rose-dark)', whiteSpace: 'nowrap' }}>
                          ₹{exp.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            <CheckCircle2 size={12} />
                            {exp.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px' }}>
                          {exp.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Receipt size={40} style={{ color: 'var(--surface-soft)', marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>No confirmed bookings yet</h4>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  When you accept quotes from catering, photography, venue, or other vendors, their costs will automatically deduct from this event budget.
                </p>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};
