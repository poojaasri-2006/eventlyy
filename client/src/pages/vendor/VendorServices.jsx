import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import { Modal } from '../../components/Modal';

export const VendorServices = () => {
  const { token } = useAuth();
  
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState('FLAT_RATE');
  const [categoryId, setCategoryId] = useState('');

  const fetchServicesAndCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vendor/services`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/vendors/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (!servicesRes.ok) throw new Error('Failed to load services');
      
      const servicesData = await servicesRes.json();
      setServices(servicesData);
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndCategories();
    // eslint-disable-next-line
  }, [token]);

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('');
    setPricingType('FLAT_RATE');
    setCategoryId('');
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price ? service.price.toString() : '');
    setPricingType(service.pricingType || 'FLAT_RATE');
    setCategoryId(service.categoryId || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const endpoint = editingService 
        ? `${API_BASE_URL}/api/vendor/services/${editingService.id}`
        : `${API_BASE_URL}/api/vendor/services`;
        
      const method = editingService ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name, 
          description, 
          price: price ? parseFloat(price) : null,
          pricingType,
          categoryId: categoryId || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save service');
      }

      closeModal();
      fetchServicesAndCategories();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/vendor/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete service');
      fetchServicesAndCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !services.length) return <LoadingState />;

  if (error && !services.length) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
        <Button variant="primary" onClick={fetchServicesAndCategories}>Try Again</Button>
      </Card>
    );
  }

  const formatPricingType = (type) => {
    switch(type) {
      case 'FLAT_RATE': return 'Flat Rate';
      case 'HOURLY': return 'per hour';
      case 'PER_GUEST': return 'per guest';
      case 'CUSTOM': return 'Custom Pricing';
      default: return 'Flat Rate';
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Services</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage the individual services you offer to organizers.</p>
        </div>
        <Button variant="primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Service
        </Button>
      </div>

      {services.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {services.map(service => (
            <Card key={service.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>{service.name}</h3>
                  {service.price !== null && (
                    <span style={{ backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      ${service.price.toLocaleString()} {formatPricingType(service.pricingType)}
                    </span>
                  )}
                </div>
                {service.category && (
                  <p style={{ color: 'var(--primary-rose)', fontSize: '0.85rem', margin: '0 0 1rem 0', fontWeight: '500' }}>
                    {service.category.name}
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  {service.description || <span style={{ fontStyle: 'italic' }}>No description provided.</span>}
                </p>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-soft)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Button variant="outline" onClick={() => openEditModal(service)} style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Edit2 size={16} /> Edit
                </Button>
                <button 
                  onClick={() => handleDelete(service.id)}
                  style={{ background: 'none', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-normal)', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Briefcase size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No services yet</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>You haven't added any services to your profile.</p>
          <Button variant="primary" onClick={openAddModal}>Add Your First Service</Button>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingService ? 'Edit Service' : 'Add New Service'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Service Name *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wedding Photography"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Price ($)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Optional"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Pricing Type</label>
              <select 
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}
              >
                <option value="FLAT_RATE">Flat Rate</option>
                <option value="HOURLY">Hourly</option>
                <option value="PER_GUEST">Per Guest</option>
                <option value="CUSTOM">Custom Pricing</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Category</label>
            <select 
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}
            >
              <option value="">Select a category (optional)...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is included in this service..."
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Service'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
