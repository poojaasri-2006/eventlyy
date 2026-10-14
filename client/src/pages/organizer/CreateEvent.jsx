import API_BASE_URL from '../../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export const CreateEvent = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    date: '',
    location: '',
    guestCount: '',
    budget: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const eventTypes = [
    'Wedding',
    'Birthday',
    'Engagement',
    'Corporate',
    'Conference',
    'College Event',
    'Party',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.name.trim()) return "Event Name is required";
    if (!formData.type) return "Event Type is required";
    if (!formData.date) return "Event Date is required";
    if (!formData.location.trim()) return "Location is required";
    if (!formData.guestCount || Number(formData.guestCount) <= 0) return "Valid Expected Guests is required";
    if (!formData.budget || Number(formData.budget) <= 0) return "Valid Estimated Budget is required";
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
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Event created successfully.');
        setTimeout(() => {
          navigate(`/organizer/events/${data.id}`);
        }, 1500);
      } else {
        setError(data.message || 'Unable to create event. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to create event. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Create Your Event</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tell us about your event so you can start finding the right vendors.</p>
      </div>

      <Card style={{ padding: '2rem' }}>
        {error && (
          <div style={{ backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'var(--success-sage)', color: '#fff', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.5rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Event Name</label>
            <Input 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder="Enter your event name" 
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Event Type</label>
              <select 
                name="type" 
                value={formData.type} 
                onChange={handleInputChange}
                className="input"
                style={{ appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                disabled={loading}
              >
                <option value="">Select event type</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Event Date</label>
              <Input 
                type="date"
                name="date" 
                value={formData.date} 
                onChange={handleInputChange} 
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Location</label>
            <Input 
              name="location" 
              value={formData.location} 
              onChange={handleInputChange} 
              placeholder="Enter event location" 
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Expected Guests</label>
              <Input 
                type="number"
                name="guestCount" 
                value={formData.guestCount} 
                onChange={handleInputChange} 
                placeholder="e.g. 150" 
                min="1"
                disabled={loading}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estimated Budget ($)</label>
              <Input 
                type="number"
                name="budget" 
                value={formData.budget} 
                onChange={handleInputChange} 
                placeholder="e.g. 5000" 
                min="1"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Event Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input"
              placeholder="Tell us a little about your event..."
              rows={4}
              style={{ resize: 'vertical' }}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => navigate('/organizer/events')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Creating Event...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Card>

      <style>{`
        @media (min-width: 768px) {
          form > div:nth-child(2),
          form > div:nth-child(4) {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
