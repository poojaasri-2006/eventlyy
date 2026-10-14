import React from 'react';
import { Link } from 'react-router-dom';

export const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Evently</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Home</Link>
        <Link to="/organizer/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Organizer Dashboard</Link>
        <Link to="/vendor/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Vendor Dashboard</Link>
      </div>
    </div>
  );
};
