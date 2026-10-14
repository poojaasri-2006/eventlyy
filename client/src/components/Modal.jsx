import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

export const Modal = ({ isOpen, onClose, title, children, closeDisabled = false }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <Card style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{title}</h3>
          <Button variant="outline" onClick={onClose} disabled={closeDisabled} style={{ padding: '0.25rem 0.75rem' }}>X</Button>
        </div>
        {children}
      </Card>
    </div>
  );
};
