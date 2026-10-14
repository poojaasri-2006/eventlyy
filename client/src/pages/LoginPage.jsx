import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMessage] = useState(() => {
    const message = location.state?.accountMessage || sessionStorage.getItem('evently_account_message');
    sessionStorage.removeItem('evently_account_message');
    return message;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.user.role === 'ORGANIZER') {
          navigate('/organizer/dashboard');
        } else if (result.user.role === 'VENDOR') {
          navigate('/vendor/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(result.message || 'Failed to login');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--background-rose-light)',
      padding: '2rem'
    }}>
      <Card style={{ width: '100%', maxWidth: '450px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-rose-dark)' }}>
          Welcome Back to Evently
        </h2>

        {accountMessage && (
          <div role="status" style={{
            backgroundColor: 'var(--primary-rose-tint)',
            color: 'var(--primary-rose-dark)',
            padding: '1rem',
            borderRadius: 'var(--radius-normal)',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {accountMessage}
          </div>
        )}
        
        {error && (
          <div style={{ backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Email Address</label>
            <Input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Password</label>
            <Input 
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <Button variant="primary" type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary-rose)', fontWeight: '500', textDecoration: 'none' }}>Sign up</Link>
        </div>
      </Card>
    </div>
  );
};
