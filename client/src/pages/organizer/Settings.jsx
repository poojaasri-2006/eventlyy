import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Lock, LogOut, Trash2, Bell, Check } from 'lucide-react';

export const Settings = () => {
  const { token, logout } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notification preferences state
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefs, setPrefs] = useState({
    eventUpdates: true,
    vendorActivity: true,
    quotesAndBookings: true,
    generalSystem: true
  });

  const fetchPreferences = async () => {
    try {
      setPrefsLoading(true);
      setPrefsError(null);
      const res = await fetch(`${API_BASE_URL}/api/profile/notification-preferences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to load preferences');
      }
      const data = await res.json();
      setPrefs({
        eventUpdates: data.eventUpdates,
        vendorActivity: data.vendorActivity,
        quotesAndBookings: data.quotesAndBookings,
        generalSystem: data.generalSystem
      });
    } catch (err) {
      setPrefsError(err.message);
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
    // eslint-disable-next-line
  }, [token]);

  const handleSavePreferences = async () => {
    try {
      setPrefsSaving(true);
      setPrefsError(null);
      setPrefsSuccess(false);
      const res = await fetch(`${API_BASE_URL}/api/profile/notification-preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save preferences');
      }
      const data = await res.json();
      setPrefs({
        eventUpdates: data.eventUpdates,
        vendorActivity: data.vendorActivity,
        quotesAndBookings: data.quotesAndBookings,
        generalSystem: data.generalSystem
      });
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch (err) {
      setPrefsError(err.message);
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setPwdError('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return setPwdError('New password must be at least 6 characters');
    }
    
    try {
      setSavingPwd(true);
      setPwdError(null);
      setPwdSuccess(false);

      const res = await fetch(`${API_BASE_URL}/api/profile/password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update password');
      }

      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return setDeleteError('Please enter your password to confirm.');
    
    if (!window.confirm('WARNING: This action cannot be undone. Are you absolutely sure you want to delete your account?')) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`${API_BASE_URL}/api/profile/delete-account`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete account');
      }

      // If it actually succeeds (schema allowing), log out.
      logout();
    } catch (err) {
      setDeleteError(err.message);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account security and preferences.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Security / Password */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} style={{ color: 'var(--primary-rose)' }} /> Change Password
          </h3>
          
          {pwdError && <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{pwdError}</div>}
          {pwdSuccess && <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>Password updated successfully!</div>}

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Current Password</label>
              <input 
                type="password" 
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>New Password</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button type="submit" variant="primary" disabled={savingPwd}>
                {savingPwd ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Notification Preferences */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} style={{ color: 'var(--primary-rose)' }} /> Notification Preferences
          </h3>

          {prefsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--primary-rose)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Loading preferences…
            </div>
          ) : (
            <>
              {prefsError && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {prefsError}
                  <button onClick={fetchPreferences} style={{ marginLeft: '1rem', color: '#ef4444', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
                </div>
              )}
              {prefsSuccess && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} /> Preferences saved successfully!
                </div>
              )}

              <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Choose which in-app notifications you want to receive. Email delivery is not yet supported.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { key: 'eventUpdates', label: 'Event Updates', description: 'Notifications about your event status changes and requirements.' },
                  { key: 'vendorActivity', label: 'Vendor Activity', description: 'Notifications when vendors respond to your inquiries.' },
                  { key: 'quotesAndBookings', label: 'Quotes & Bookings', description: 'Notifications when quotes are submitted and booking statuses change.' },
                  { key: 'generalSystem', label: 'General & System', description: 'Important system messages and general platform updates.' }
                ].map(({ key, label, description }) => (
                  <div
                    key={key}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)', gap: '1rem' }}
                  >
                    <div>
                      <p style={{ margin: '0 0 0.2rem 0', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{description}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[key]}
                      onClick={() => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        flexShrink: 0,
                        width: '48px',
                        height: '26px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: prefs[key] ? 'var(--primary-rose)' : '#d1d5db',
                        position: 'relative',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: prefs[key] ? '25px' : '3px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <Button variant="primary" onClick={handleSavePreferences} disabled={prefsSaving}>
                  {prefsSaving ? 'Saving…' : 'Save Preferences'}
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Danger Zone */}
        <Card style={{ padding: '1.5rem', border: '1px solid #fee2e2' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Danger Zone
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          {deleteError && <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{deleteError}</div>}

          {!showDeleteConfirm ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="outline" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={18} /> Log Out
              </Button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-normal)', padding: '0.75rem 1.5rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Trash2 size={18} /> Delete Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} style={{ backgroundColor: '#fff5f5', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#b91c1c', fontWeight: '500' }}>Confirm Account Deletion</p>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: '#991b1b' }}>Enter your password to verify your identity:</label>
              <input 
                type="password" 
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit"
                  disabled={deleting}
                  style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-normal)', padding: '0.75rem 1.5rem', fontWeight: '500', cursor: deleting ? 'not-allowed' : 'pointer' }}
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }} type="button">
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
        
      </div>
    </div>
  );
};
