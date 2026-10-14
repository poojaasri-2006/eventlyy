import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export const EventCard = ({ event }) => {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3>{event.title}</h3>
          <p>{event.date}</p>
          <p>{event.location}</p>
        </div>
        <Badge status={event.status} />
      </div>
    </Card>
  );
};
