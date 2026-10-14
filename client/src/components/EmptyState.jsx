import React from 'react';
import { Card } from './Card';

export const EmptyState = ({ message = "No data found", description, action }) => {
  return (
    <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{message}</h3>
      {description && <p style={{ color: 'var(--text-secondary)', marginBottom: action ? '2rem' : 0 }}>{description}</p>}
      {action && <div>{action}</div>}
    </Card>
  );
};
