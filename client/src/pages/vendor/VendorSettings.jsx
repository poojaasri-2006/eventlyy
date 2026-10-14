import API_BASE_URL from '../../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';

const API_URL = `${API_BASE_URL}/api`;

export const VendorSettings = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [action, setAction] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deletionBlocked, setDeletionBlocked] = useState(false);

  const closeDialog = () => {
    if (busy) return;
    setAction(null);
    setPassword('');
    setConfirmation('');
    setError('');
    setDeletionBlocked(false);
  };

  const submitAccountAction = async (event) => {
    event.preventDefault();
    if (busy || !action) return;

    const expectedConfirmation = action === 'delete' ? 'DELETE' : 'DEACTIVATE';
    if (confirmation !== expectedConfirmation) {
      setError(`Type ${expectedConfirmation} exactly to continue.`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/profile/${action}-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password, confirmation })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === 'ACCOUNT_DEACTIVATION_REQUIRED') {
          setDeletionBlocked(true);
        }
        throw new Error(result.message || `Unable to ${action} this account.`);
      }

      const accountMessage = action === 'delete'
        ? 'Your vendor account has been deleted.'
        : 'Your vendor account has been deactivated. Your business history has been preserved.';
      sessionStorage.setItem('evently_account_message', accountMessage);
      navigate('/login', {
        replace: true,
        state: { accountMessage }
      });
      logout();
    } catch (requestError) {
      console.error(`[Vendor Account ${action} Error]`, requestError);
      setError(requestError.message || `Unable to ${action} this account.`);
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (nextAction) => {
    setAction(nextAction);
    setPassword('');
    setConfirmation('');
    setError('');
    setDeletionBlocked(false);
  };

  const expectedConfirmation = action === 'delete' ? 'DELETE' : 'DEACTIVATE';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Vendor Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your vendor account.</p>
      </div>

      <Card style={{
        padding: '1.75rem',
        border: '1px solid var(--primary-rose-tint)',
        borderTop: '4px solid var(--primary-rose)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Trash2 size={21} style={{ color: 'var(--primary-rose-dark)' }} />
          <h2 style={{ margin: 0, color: 'var(--primary-rose-dark)', fontSize: '1.2rem' }}>Delete Account</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          Deleting your account may permanently remove your vendor profile, services, packages,
          availability, and account notifications. Business records connected to organizers,
          including bookings and conversations, are preserved; if those records prevent deletion,
          you can deactivate your account instead.
        </p>
        <Button
          variant="outline"
          onClick={() => openDialog('delete')}
          style={{ borderColor: 'var(--primary-rose-dark)', color: 'var(--primary-rose-dark)' }}
        >
          Delete Account
        </Button>
      </Card>

      <Modal
        isOpen={Boolean(action)}
        onClose={closeDialog}
        closeDisabled={busy}
        title={action === 'delete' ? 'Confirm Account Deletion' : 'Confirm Account Deactivation'}
      >
        {action && (
          <form onSubmit={submitAccountAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-rose-tint)',
              color: 'var(--primary-rose-dark)'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                {action === 'delete'
                  ? 'This action cannot be undone. Your profile and eligible account data will be permanently deleted.'
                  : 'Your account access will be disabled. Your profile and business history will remain stored.'}
              </p>
            </div>

            {error && (
              <div role="alert" style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                borderRadius: 'var(--radius-md)'
              }}>
                {error}
              </div>
            )}

            {deletionBlocked && action === 'delete' && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => openDialog('deactivate')}
                style={{ borderColor: 'var(--primary-rose)', color: 'var(--primary-rose-dark)' }}
              >
                Deactivate Account Instead
              </Button>
            )}

            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '0.35rem',
                  padding: '0.75rem',
                  border: '1px solid var(--surface-soft)',
                  borderRadius: 'var(--radius-md)'
                }}
              />
            </label>

            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              Type <strong>{expectedConfirmation}</strong> to confirm
              <input
                type="text"
                autoComplete="off"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '0.35rem',
                  padding: '0.75rem',
                  border: '1px solid var(--surface-soft)',
                  borderRadius: 'var(--radius-md)'
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
                Keep Account
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || confirmation !== expectedConfirmation || !password}
                style={{ backgroundColor: action === 'delete' ? '#b91c1c' : 'var(--primary-rose)' }}
              >
                {busy
                  ? (action === 'delete' ? 'Deleting…' : 'Deactivating…')
                  : (action === 'delete' ? 'Permanently Delete' : 'Deactivate Account')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
