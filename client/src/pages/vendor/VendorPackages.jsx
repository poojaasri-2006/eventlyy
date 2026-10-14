import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Plus, Edit2, Trash2, Package, Tag, Layers, CheckSquare, Square, Check } from 'lucide-react';
import { Modal } from '../../components/Modal';

export const VendorPackages = () => {
  const { token } = useAuth();
  
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = { 'Authorization': `Bearer ${token}` };
      const [packagesRes, categoriesRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vendor/packages`, { headers }),
        fetch(`${API_BASE_URL}/api/vendors/categories`, { headers }),
        fetch(`${API_BASE_URL}/api/vendor/services`, { headers })
      ]);

      if (!packagesRes.ok) throw new Error('Failed to load packages');
      
      const packagesData = await packagesRes.json();
      setPackages(packagesData);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [token]);

  const openAddModal = () => {
    setEditingPackage(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategoryId('');
    setSelectedServiceIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setPrice(pkg.price.toString());
    setCategoryId(pkg.categoryId || '');
    setSelectedServiceIds((pkg.services || []).map(s => s.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
    setFormError(null);
  };

  const toggleService = (serviceId) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFormError(null);
      
      const endpoint = editingPackage 
        ? `${API_BASE_URL}/api/vendor/packages/${editingPackage.id}`
        : `${API_BASE_URL}/api/vendor/packages`;
        
      const method = editingPackage ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name, 
          description, 
          price: parseFloat(price),
          categoryId: categoryId || null,
          serviceIds: selectedServiceIds
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save package');
      }

      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/vendor/packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete package');
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !packages.length) return <LoadingState />;

  if (error && !packages.length) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
        <Button variant="primary" onClick={fetchData}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Packages</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create bundled packages by linking your services and setting custom package pricing.</p>
        </div>
        <Button variant="primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Package
        </Button>
      </div>

      {packages.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {packages.map(pkg => (
            <Card key={pkg.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '600' }}>{pkg.name}</h3>
                  {pkg.category && (
                    <span style={{
                      backgroundColor: 'var(--primary-rose-tint)',
                      color: 'var(--primary-rose-dark)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Tag size={12} /> {pkg.category.name}
                    </span>
                  )}
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--primary-rose-dark)' }}>
                    ${Number(pkg.price).toLocaleString()}
                  </span>
                </div>

                {pkg.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.25rem 0', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {pkg.description}
                  </p>
                )}

                {/* Linked Services Section */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--surface-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>
                    <Layers size={14} style={{ color: 'var(--primary-rose)' }} />
                    <span>Included Services ({pkg.services ? pkg.services.length : 0})</span>
                  </div>
                  {pkg.services && pkg.services.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {pkg.services.map(srv => (
                        <span
                          key={srv.id}
                          style={{
                            backgroundColor: 'var(--surface-soft)',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #e5e7eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Check size={12} style={{ color: 'var(--primary-rose)' }} />
                          {srv.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No linked services. (Custom package)
                    </p>
                  )}
                </div>
              </div>

              <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid var(--surface-soft)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#fafafa' }}>
                <Button variant="outline" onClick={() => openEditModal(pkg)} style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Edit2 size={15} /> Edit
                </Button>
                <button 
                  onClick={() => handleDelete(pkg.id)}
                  style={{ background: 'none', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-normal)', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'background 0.2s', fontSize: '0.85rem' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--surface-soft)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No packages yet</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>Bundle your individual services into high-value packages for organizers.</p>
          <Button variant="primary" onClick={openAddModal}>Add Your First Package</Button>
        </Card>
      )}

      {/* Add / Edit Package Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPackage ? 'Edit Package' : 'Add New Package'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {formError && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Package Name *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Complete Wedding Photography & Video Bundle"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Package Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}
              >
                <option value="">Select a category (Optional)...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Package Price ($) *</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Total package price"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
          </div>

          {/* Multi-Select Included Services */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Included Services ({selectedServiceIds.length} selected)
              </label>
              {services.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Select from your services
                </span>
              )}
            </div>

            {services.length > 0 ? (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--surface-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                {services.map(srv => {
                  const isChecked = selectedServiceIds.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => toggleService(srv.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isChecked ? 'var(--primary-rose-tint)' : '#fff',
                        cursor: 'pointer',
                        border: isChecked ? '1px solid var(--primary-rose)' : '1px solid #e5e7eb',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} style={{ color: 'var(--primary-rose)', flexShrink: 0 }} />
                      ) : (
                        <Square size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: isChecked ? '600' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {srv.name}
                        </span>
                        {srv.price !== null && srv.price !== undefined && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                            ${srv.price}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                You have not created any services yet. You can create a standalone package now or add services later in the Services tab.
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Package Description</label>
            <textarea 
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what organizers receive with this package, deliverables, and terms..."
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Package'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
