import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';

export const LandingPage = () => {
  const location = useLocation();
  const accountMessage = location.state?.accountMessage;

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          .logo-circle {
            width: clamp(200px, 40vw, 350px);
            height: clamp(200px, 40vw, 350px);
            background-color: var(--primary-rose, #b5626d);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 20px 40px rgba(181, 98, 109, 0.2);
            transition: transform 0.3s ease;
          }
          .logo-text {
            color: #fff;
            font-family: 'Great Vibes', cursive;
            font-size: clamp(3rem, 8vw, 6rem);
            margin: 0;
            user-select: none;
            line-height: 1;
          }
        `}
      </style>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '1.5rem 5%', 
        backgroundColor: '#fff',
        flexWrap: 'wrap',
        gap: '1rem',
        flexShrink: 0
      }}>
        <div style={{ flex: 1, minWidth: '10px' }}></div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 'fit-content' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}><Button variant="outline">Log In</Button></Link>
          <Link to="/register" style={{ textDecoration: 'none' }}><Button variant="primary">Sign Up</Button></Link>
        </div>
      </nav>

      {accountMessage && (
        <div role="status" style={{
          margin: '0 auto',
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-normal)',
          backgroundColor: 'var(--primary-rose-tint)',
          color: 'var(--primary-rose-dark)',
          fontWeight: 500
        }}>
          {accountMessage}
        </div>
      )}

      {/* Center Focus Area */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="logo-circle">
          <h1 className="logo-text">Evently</h1>
        </div>
      </main>
    </div>
  );
};
