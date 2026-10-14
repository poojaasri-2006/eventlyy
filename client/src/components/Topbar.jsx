import API_BASE_URL from '../config';
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

export const Topbar = () => {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnread();
    
    // Listen for custom event from Notifications page
    const handleUpdate = () => fetchUnread();
    window.addEventListener('notifications-updated', handleUpdate);
    return () => window.removeEventListener('notifications-updated', handleUpdate);
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', backgroundColor: '#fff', borderBottom: '1px solid var(--surface-soft)' }}>
      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Dashboard</h3>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link to="/organizer/notifications" style={{ textDecoration: 'none', color: 'var(--text-secondary)', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Bell size={24} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '50%',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        {user && <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user.email}</span>}
        <Button variant="outline" onClick={handleLogout}>Log Out</Button>
      </div>
    </div>
  );
};
