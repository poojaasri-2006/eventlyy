import API_BASE_URL from '../config';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';

export const RegisterPage = () => {
  const [role, setRole] = useState('ORGANIZER');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessCategory: '',
    businessLocation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.fullName.trim()) return "Full name is required";
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) return "Valid email is required";
    if (!formData.phone.trim()) return "Phone number is required";
    if (!formData.password || formData.password.length < 6) return "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    
    if (role === 'VENDOR') {
      if (!formData.businessName.trim()) return "Business name is required";
      if (!formData.businessCategory) return "Business category is required";
      if (!formData.businessLocation.trim()) return "Business location is required";
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Account created successfully. Please log in.");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        if (response.status === 409) {
          setError(data.message || 'An account with this email already exists.');
        } else {
          setError(data.message || 'Registration failed.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
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
      <Card style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary-rose-dark)', marginBottom: '0.5rem', fontSize: '2rem' }}>Evently</h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Create Your Evently Account</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Join Evently and start planning your perfect event.</p>
        </div>
        
        {error && (
          <div style={{ backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'var(--success-sage)', color: '#fff', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem', textAlign: 'center' }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <Button 
            variant={role === 'ORGANIZER' ? 'primary' : 'outline'} 
            style={{ flex: 1 }}
            onClick={() => setRole('ORGANIZER')}
            type="button"
          >
            Organizer
          </Button>
          <Button 
            variant={role === 'VENDOR' ? 'primary' : 'outline'} 
            style={{ flex: 1 }}
            onClick={() => setRole('VENDOR')}
            type="button"
          >
            Vendor
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
              <Input name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
              <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 234 567 890" />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
            <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
              <Input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Min 6 characters" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Confirm Password</label>
              <Input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm password" />
            </div>
          </div>

          {role === 'VENDOR' && (
            <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Business Details</h3>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Business Name</label>
                <Input name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="Your Business Name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category</label>
                  <select 
                    name="businessCategory" 
                    value={formData.businessCategory} 
                    onChange={handleInputChange}
                    className="input"
                    style={{ appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                  >
                    <option value="">Select Category</option>
                    <option value="Venue">Venue</option>
                    <option value="Photography">Photography</option>
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Music & DJ">Music & DJ</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Invitations">Invitations</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Location</label>
                  <Input name="businessLocation" value={formData.businessLocation} onChange={handleInputChange} placeholder="City, State" />
                </div>
              </div>
            </div>
          )}
          
          <Button variant="primary" type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary-rose)', fontWeight: '500', textDecoration: 'none' }}>Log In</Link>
        </div>
      </Card>
    </div>
  );
};
