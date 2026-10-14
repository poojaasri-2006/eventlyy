import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { VendorWebsiteAssessmentRating } from './VendorRating';

export const VendorCard = ({ vendor }) => {
  return (
    <Card className="vendor-card" style={{ padding: 0 }}>
      <img src={vendor.image || 'https://via.placeholder.com/400x200'} alt={vendor.name} className="photo" style={{ borderRadius: 'var(--radius-large) var(--radius-large) 0 0', height: '200px' }} />
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', rowGap: '0.25rem' }}>
          <h3 style={{ margin: 0 }}>{vendor.name}</h3>
          <VendorWebsiteAssessmentRating assessment={vendor.websiteAssessment} />
        </div>
        <p>{vendor.category}</p>
        <p style={{ marginTop: '0.5rem', fontWeight: '500', color: 'var(--primary-rose)' }}>{vendor.price}</p>
        <div style={{ marginTop: '1rem' }}>
          <Button variant="outline" style={{ width: '100%' }}>View Details</Button>
        </div>
      </div>
    </Card>
  );
};
