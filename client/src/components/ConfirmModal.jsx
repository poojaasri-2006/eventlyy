import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  errorMessage = '',
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  cancelDisabled = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ marginBottom: '2rem' }}>{message}</p>
      {errorMessage && (
        <p role="alert" style={{ color: 'var(--primary-rose-dark)', marginTop: '-1rem', marginBottom: '1rem' }}>
          {errorMessage}
        </p>
      )}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={onClose} disabled={cancelDisabled}>Cancel</Button>
        <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
};
