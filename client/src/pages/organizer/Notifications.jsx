import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Bell, Check, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

const TYPE_LABELS = {
  INQUIRY_RESPONSE: 'Inquiry',
  QUOTE_SUBMITTED: 'Quote',
  QUOTE_UPDATED: 'Quote',
  BOOKING_UPDATED: 'Booking',
  GENERAL: 'Update'
};

const TYPE_COLORS = {
  INQUIRY_RESPONSE: '#6366f1',
  QUOTE_SUBMITTED: '#f59e0b',
  QUOTE_UPDATED: '#10b981',
  BOOKING_UPDATED: '#3b82f6',
  GENERAL: 'var(--primary-rose)'
};

export const Notifications = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data);
      
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [token]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to update notification');
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to update notifications');
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      alert(err.message);
    }
  };

  // Navigate to related entity, marking the notification read first
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    // Resolve the best deep link available
    if (notification.bookingId) {
      navigate(`/organizer/bookings/${notification.bookingId}`);
    } else if (notification.quoteId) {
      navigate('/organizer/quotes');
    } else if (notification.inquiryId) {
      navigate('/organizer/inquiries');
    } else if (notification.eventId) {
      navigate(`/organizer/events/${notification.eventId}`);
    }
  };

  const hasLink = (n) => !!(n.bookingId || n.quoteId || n.inquiryId || n.eventId);

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'READ') return n.isRead;
    return true;
  });

  if (loading && notifications.length === 0) return <LoadingState />;

  if (error) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
        <Button variant="primary" onClick={fetchNotifications}>Try Again</Button>
      </Card>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'var(--primary-rose)', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: '999px' }}>
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Stay updated on your events and vendor activity.</p>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} /> Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['ALL', 'UNREAD', 'READ'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: filter === f ? 'var(--primary-rose-tint)' : 'transparent',
              color: filter === f ? 'var(--primary-rose-dark)' : 'var(--text-secondary)',
              fontWeight: filter === f ? '600' : '400',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {f === 'ALL' ? 'All' : f === 'UNREAD' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'Read'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length > 0 ? (
          filtered.map((notification) => {
            const typeColor = TYPE_COLORS[notification.type] || TYPE_COLORS.GENERAL;
            const typeLabel = TYPE_LABELS[notification.type] || 'Update';
            const clickable = hasLink(notification);

            return (
              <Card
                key={notification.id}
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  backgroundColor: notification.isRead ? '#fff' : 'var(--background-rose-light, #fdf6f7)',
                  borderLeft: notification.isRead ? '3px solid transparent' : `3px solid var(--primary-rose)`,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'box-shadow 0.2s ease'
                }}
                onClick={() => clickable && handleNotificationClick(notification)}
                onMouseEnter={e => clickable && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                onMouseLeave={e => clickable && (e.currentTarget.style.boxShadow = '')}
              >
                {/* Type Badge + Icon */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${typeColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={16} style={{ color: typeColor }} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600' }}>
                        {notification.title}
                      </h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: typeColor, backgroundColor: `${typeColor}15`, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
                        {typeLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: '400' }}>
                      {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {notification.content}
                  </p>

                  {clickable && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-rose)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ExternalLink size={12} /> View details
                    </span>
                  )}
                </div>

                {/* Read indicator */}
                <div style={{ flexShrink: 0 }}>
                  {!notification.isRead ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                      title="Mark as read"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--primary-rose)', display: 'flex' }}
                    >
                      <Circle size={18} />
                    </button>
                  ) : (
                    <div style={{ padding: '0.25rem', color: '#10b981' }}>
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Bell size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>All caught up!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {filter !== 'ALL'
                ? `You don't have any ${filter.toLowerCase()} notifications.`
                : 'You have no notifications yet. They will appear here when vendors respond to your inquiries or submit quotes.'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
