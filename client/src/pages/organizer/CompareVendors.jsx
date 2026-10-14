import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { X, CheckCircle, ChevronDown } from 'lucide-react';

export const CompareVendors = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // We only want to compare unique vendors. A vendor might be shortlisted across multiple events.
  const [uniqueVendors, setUniqueVendors] = useState([]);
  
  // Selected vendor IDs for comparison (max 3)
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  // UI state for dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_BASE_URL}/api/shortlist`, { headers });
      if (!res.ok) throw new Error('Failed to fetch shortlist');
      
      const data = await res.json();
      setShortlists(data);

      // Extract unique vendors
      const vendorMap = new Map();
      data.forEach(item => {
        if (item.vendor) {
          vendorMap.set(item.vendor.id, item.vendor);
        }
      });
      setUniqueVendors(Array.from(vendorMap.values()));
    } catch (err) {
      console.error(err);
      setError('Unable to load shortlisted vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Helpers
  const getVendorRating = (vendor) => {
    if (!vendor || !vendor.reviews || vendor.reviews.length === 0) return 0;
    const sum = vendor.reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / vendor.reviews.length;
  };

  const getStartingPrice = (vendor) => {
    if (!vendor) return null;
    const prices = [];
    if (vendor.packages && vendor.packages.length > 0) {
      prices.push(...vendor.packages.map(p => p.price));
    }
    if (vendor.services && vendor.services.length > 0) {
      prices.push(...vendor.services.filter(s => s.price).map(s => s.price));
    }
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const parseLocation = (description) => {
    if (description && description.includes('location:')) {
      return description.split('location:')[1].trim();
    }
    return 'Not provided';
  };

  const toggleVendorSelection = (vendorId) => {
    if (selectedVendorIds.includes(vendorId)) {
      setSelectedVendorIds(prev => prev.filter(id => id !== vendorId));
    } else {
      if (selectedVendorIds.length >= 3) {
        alert('You can compare up to 3 vendors at a time.');
        return;
      }
      setSelectedVendorIds(prev => [...prev, vendorId]);
    }
    setShowDropdown(false);
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  if (uniqueVendors.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Your shortlist is empty.</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Explore vendors and save your favorites before comparing.</p>
        <Link to="/organizer/vendors">
          <Button variant="primary">Find Vendors</Button>
        </Link>
      </div>
    );
  }

  if (uniqueVendors.length < 2) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Not enough vendors to compare</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Add at least two vendors to your shortlist to compare them.</p>
        <Link to="/organizer/vendors">
          <Button variant="primary">Find Vendors</Button>
        </Link>
      </div>
    );
  }

  const selectedVendors = selectedVendorIds.map(id => uniqueVendors.find(v => v.id === id));
  const unselectedVendors = uniqueVendors.filter(v => !selectedVendorIds.includes(v.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Compare Vendors</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Compare your shortlisted vendors and choose the right fit for your event.</p>
      </div>

      {/* Selector */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
        <div 
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ 
            padding: '0.75rem 1rem', 
            backgroundColor: 'var(--card-white)', 
            border: '1px solid var(--surface-soft)', 
            borderRadius: 'var(--radius-normal)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ color: selectedVendorIds.length < 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {selectedVendorIds.length < 3 ? `Select up to ${3 - selectedVendorIds.length} more vendors...` : 'Maximum 3 vendors selected'}
          </span>
          <ChevronDown size={18} color="var(--text-secondary)" />
        </div>

        {showDropdown && (
          <Card style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', padding: '1rem', zIndex: 10, maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uniqueVendors.map(v => {
                const isSelected = selectedVendorIds.includes(v.id);
                return (
                  <div 
                    key={v.id} 
                    onClick={() => toggleVendorSelection(v.id)}
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: 'var(--radius-normal)', 
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected ? 'var(--primary-rose-tint)' : 'var(--card-white)',
                      border: isSelected ? '1px solid var(--primary-rose)' : '1px solid var(--surface-soft)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', color: isSelected ? 'var(--primary-rose-dark)' : 'var(--text-primary)' }}>{v.businessName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.category?.name || 'Vendor'}</div>
                    </div>
                    {isSelected && <CheckCircle size={18} color="var(--primary-rose-dark)" />}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {selectedVendors.length > 0 ? (
        <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', backgroundColor: 'var(--card-white)', borderRadius: 'var(--radius-large)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--primary-rose-tint)' }}>
                <th style={{ padding: '1.5rem', textAlign: 'left', width: '150px', borderBottom: '2px solid var(--surface-soft)' }}>
                  {/* Empty corner cell */}
                </th>
                {selectedVendors.map(vendor => (
                  <th key={vendor.id} style={{ padding: '1.5rem', textAlign: 'center', width: `${100 / selectedVendors.length}%`, borderBottom: '2px solid var(--surface-soft)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--card-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.5rem', border: '2px solid var(--primary-rose)' }}>
                        {vendor.businessName.charAt(0)}
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        {vendor.businessName}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button variant="primary" onClick={() => navigate(`/organizer/vendors/${vendor.id}`)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                          View Details
                        </Button>
                        <button 
                          onClick={() => toggleVendorSelection(vendor.id)}
                          style={{ background: 'none', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-normal)', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove from comparison"
                        >
                          <X size={16} color="var(--text-secondary)" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Category */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)' }}>Category</td>
                {selectedVendors.map(v => (
                  <td key={v.id} style={{ padding: '1rem 1.5rem', textAlign: 'center', borderBottom: '1px solid var(--surface-soft)' }}>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: 'var(--surface-soft)', borderRadius: '20px', fontSize: '0.9rem' }}>
                      {v.category?.name || 'Not provided'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Rating */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)' }}>Rating</td>
                {selectedVendors.map(v => {
                  const rating = getVendorRating(v);
                  return (
                    <td key={v.id} style={{ padding: '1rem 1.5rem', textAlign: 'center', borderBottom: '1px solid var(--surface-soft)' }}>
                      {rating > 0 ? (
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>⭐ {rating.toFixed(1)}</div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>No ratings yet</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Starting Price */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)' }}>Starting Price</td>
                {selectedVendors.map(v => {
                  const price = getStartingPrice(v);
                  return (
                    <td key={v.id} style={{ padding: '1rem 1.5rem', textAlign: 'center', borderBottom: '1px solid var(--surface-soft)' }}>
                      {price !== null ? (
                        <span style={{ fontWeight: '600', color: 'var(--success-sage)', fontSize: '1.1rem' }}>${price}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Not provided</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Location */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)' }}>Location</td>
                {selectedVendors.map(v => (
                  <td key={v.id} style={{ padding: '1rem 1.5rem', textAlign: 'center', borderBottom: '1px solid var(--surface-soft)' }}>
                    {parseLocation(v.description)}
                  </td>
                ))}
              </tr>

              {/* Services List */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)', verticalAlign: 'top' }}>Services</td>
                {selectedVendors.map(v => (
                  <td key={v.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-soft)', verticalAlign: 'top' }}>
                    {v.services && v.services.length > 0 ? (
                      <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {v.services.map(s => (
                          <li key={s.id} style={{ marginBottom: '0.25rem' }}>{s.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not provided</div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Packages List */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-soft)', verticalAlign: 'top' }}>Packages</td>
                {selectedVendors.map(v => (
                  <td key={v.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-soft)', verticalAlign: 'top' }}>
                    {v.packages && v.packages.length > 0 ? (
                      <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {v.packages.map(p => (
                          <li key={p.id} style={{ marginBottom: '0.25rem' }}>{p.name} (${p.price})</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not provided</div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Description */}
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', verticalAlign: 'top' }}>Description</td>
                {selectedVendors.map(v => {
                  let text = v.description || 'Not provided';
                  if (text.includes('location:')) {
                    text = text.split('location:')[0].trim();
                  }
                  return (
                    <td key={v.id} style={{ padding: '1rem 1.5rem', verticalAlign: 'top' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {text || 'Not provided'}
                      </p>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <Card style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--surface-soft)' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Select vendors from the dropdown above to start comparing.</p>
        </Card>
      )}
    </div>
  );
};
