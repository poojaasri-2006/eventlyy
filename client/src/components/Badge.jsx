import React from 'react';

export const Badge = ({ children, status }) => {
  return (
    <span className="chip" style={{ backgroundColor: status === 'CONFIRMED' ? 'var(--success-sage)' : 'var(--primary-rose-tint)', color: status === 'CONFIRMED' ? '#fff' : 'var(--primary-rose-dark)' }}>
      {children || status}
    </span>
  );
};
