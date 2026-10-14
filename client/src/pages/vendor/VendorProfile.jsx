import API_BASE_URL from '../../config';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Info,
  ShieldCheck,
  Camera,
  Trash2,
  MapPin,
  Upload,
  Check
} from 'lucide-react';

export const VendorProfile = () => {
  const { token, user: authUser } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [imageSuccess, setImageSuccess] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const fetchProfileAndCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/vendors/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setProfile(profileData);

      if (profileData.vendorProfile) {
        const vp = profileData.vendorProfile;
        setBusinessName(vp.businessName || '');
        setDescription(vp.description || '');
        setPhone(vp.phone || '');
        setWebsite(vp.website || '');
        setCategoryId(vp.categoryId || '');
        setImageUrl(vp.imageUrl || '');
        setAddress(vp.address || '');
        setCity(vp.city || '');
        setState(vp.state || '');
        setPostalCode(vp.postalCode || '');
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndCategories();
    // eslint-disable-next-line
  }, [token]);

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setImageError('Please choose a valid image file (JPEG, PNG, WEBP, or GIF).');
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be smaller than 5 MB.');
      return;
    }

    try {
      setUploadingImage(true);
      setImageError(null);
      setImageSuccess(false);

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE_URL}/api/profile/vendor/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload image');
      }

      const data = await res.json();
      setImageUrl(data.imageUrl);
      setImageSuccess(true);
      setTimeout(() => setImageSuccess(false), 3000);

      // Refresh parent profile state
      fetchProfileAndCategories();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm('Are you sure you want to remove your profile image?')) return;

    try {
      setUploadingImage(true);
      setImageError(null);

      const res = await fetch(`${API_BASE_URL}/api/profile/vendor`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl: null })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to remove image');
      }

      setImageUrl('');
      fetchProfileAndCategories();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(`${API_BASE_URL}/api/profile/vendor`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessName,
          description,
          phone,
          website,
          categoryId,
          imageUrl,
          address,
          city,
          state,
          postalCode
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update profile');
      }

      setSuccess(true);
      fetchProfileAndCategories();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Profile completion calculation based on real database fields
  const getProfileCompletion = () => {
    if (!profile?.vendorProfile) return 0;
    const vp = profile.vendorProfile;
    let completed = 0;
    const total = 8;
    if (vp.businessName) completed++;
    if (vp.description) completed++;
    if (vp.phone) completed++;
    if (vp.website) completed++;
    if (vp.categoryId) completed++;
    if (vp.imageUrl) completed++;
    if (vp.city || vp.address) completed++;
    if (vp.state || vp.postalCode) completed++;
    return Math.round((completed / total) * 100);
  };

  const completion = getProfileCompletion();

  if (loading && !profile) return <LoadingState />;

  if (error && !profile) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)' }}>{error}</p>
        <Button variant="primary" onClick={fetchProfileAndCategories}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Business Profile</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your vendor brand, profile photo, and business location.</p>
        </div>

        {/* Progress Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '160px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>
            Profile Completion: {completion}%
          </span>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-soft)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                backgroundColor: completion === 100 ? 'var(--success-sage, #10b981)' : 'var(--primary-rose)',
                width: `${completion}%`,
                transition: 'width 0.3s ease'
              }}
            ></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Read-Only Account Info */}
        <Card style={{ padding: '1.5rem', backgroundColor: 'var(--surface-soft)' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
            <ShieldCheck size={20} style={{ color: 'var(--primary-rose)' }} /> Account Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Registered Email</p>
              <p style={{ margin: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} /> {profile?.email || authUser?.email}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Account Role</p>
              <p style={{ margin: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> {profile?.role || 'VENDOR'}
              </p>
            </div>
          </div>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            * Email changes require security verification. Contact support to modify your login credentials.
          </p>
        </Card>

        {/* Profile Image Card */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <Camera size={20} style={{ color: 'var(--primary-rose)' }} /> Profile Image
          </h3>

          {imageError && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {imageError}
            </div>
          )}
          {imageSuccess && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} /> Profile image uploaded successfully!
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={businessName || 'Vendor profile'}
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary-rose-tint)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-rose-tint)',
                    color: 'var(--primary-rose-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: '600',
                    border: '3px solid #fff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                  }}
                >
                  {businessName ? businessName.charAt(0).toUpperCase() : 'V'}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: 'var(--text-primary)' }}>
                Upload Business Logo or Cover Photo
              </p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Recommended: Square image (JPEG, PNG, WEBP, GIF). Max size: 5 MB.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                />

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Upload size={16} />
                  {uploadingImage ? 'Uploading...' : imageUrl ? 'Replace Photo' : 'Upload Photo'}
                </Button>

                {imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    <Trash2 size={16} /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Editable Profile & Location Info Form */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Business Information</h3>

          {error && <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}
          {success && <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} /> Profile updated successfully!</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Business Name *</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Website / Portfolio</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="url"
                    placeholder="https://yourbusiness.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Business Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Location Section */}
            <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MapPin size={20} style={{ color: 'var(--primary-rose)' }} />
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>Business Location</h4>
              </div>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Help organizers find you by specifying where you are based and where you provide services.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Street Address</label>
                  <input
                    type="text"
                    placeholder="123 Main St, Suite 100"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>City</label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. CA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Postal / ZIP Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 94102"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Business Description</label>
              <div style={{ position: 'relative' }}>
                <Info size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-secondary)' }} />
                <textarea
                  rows="5"
                  placeholder="Tell organizers about your services, experience, and what makes your business unique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </div>
  );
};
