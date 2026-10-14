import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { Search } from 'lucide-react';

export const MyEvents = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest First');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch events');
      
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load your events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [token]);

  // Derived state for available statuses
  const availableStatuses = ['All', ...new Set(events.map(e => e.status))];

  // Apply filters and sorting
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = 
        (event.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
        (event.location?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return sortOrder === 'Newest First' ? dateB - dateA : dateA - dateB;
    });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchEvents}>Try Again</Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Events</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage and track all your events in one place.</p>
          </div>
          <Link to="/organizer/events/create">
            <Button variant="primary">+ Create Event</Button>
          </Link>
        </div>
        <EmptyState 
          message="No events yet" 
          description="Create your first event and start planning with trusted vendors." 
          action={<Link to="/organizer/events/create"><Button variant="primary">Create Your First Event</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Events</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and track all your events in one place.</p>
        </div>
        <Link to="/organizer/events/create">
          <Button variant="primary">+ Create Event</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <Input 
              placeholder="Search events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '3rem', width: '100%' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ appearance: 'none', backgroundColor: 'var(--surface-soft)', minWidth: '150px' }}
            >
              {availableStatuses.map(status => (
                <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
              ))}
            </select>
            
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input"
              style={{ appearance: 'none', backgroundColor: 'var(--surface-soft)', minWidth: '150px' }}
            >
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Event List */}
      {filteredEvents.length > 0 ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '2rem' 
        }}>
          {filteredEvents.map(event => (
            <Card key={event.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-rose-dark)', margin: 0 }}>{event.title}</h3>
                <StatusBadge status={event.status} />
              </div>
              
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', flex: 1 }}>
                <div><strong>Date:</strong> {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}</div>
                <div><strong>Location:</strong> {event.location || 'TBD'}</div>
                <div><strong>Requirements:</strong> {event.requirements?.length || 0}</div>
                <div><strong>Bookings:</strong> {event.bookings?.length || 0}</div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => navigate(`/organizer/events/${event.id}`)}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                View Details
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          message="No matching events" 
          description="Try changing your search or filters." 
        />
      )}
    </div>
  );
};
