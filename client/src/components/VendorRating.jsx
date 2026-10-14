import React from 'react';
import { ExternalLink } from 'lucide-react';

export const VendorRating = ({ averageRating, reviewCount, style = {} }) => {
  const count = Number.isInteger(reviewCount) && reviewCount > 0 ? reviewCount : 0;
  const rating = Number(averageRating);
  const hasRating = count > 0 && Number.isFinite(rating);

  return (
    <div
      aria-label={hasRating ? `${rating.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', ...style }}
    >
      {hasRating ? (
        <>
          <span aria-hidden="true" style={{ color: 'var(--primary-rose)', fontSize: '1.05rem' }}>★</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rating.toFixed(1)} / 5</span>
          <span>({count} {count === 1 ? 'review' : 'reviews'})</span>
        </>
      ) : (
        <span>No reviews yet</span>
      )}
    </div>
  );
};

const getSafeWebsiteUrl = (website) => {
  if (typeof website !== 'string' || !website.trim()) return null;

  const value = website.trim();
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null;
  } catch {
    return null;
  }
};

export const VendorWebsiteLink = ({ website, style = {} }) => {
  const href = getSafeWebsiteUrl(website);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-rose-dark)', textDecoration: 'none', ...style }}
    >
      Website / portfolio <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
};

export const VendorWebsiteAssessmentRating = ({ assessment, style = {} }) => {
  // If no assessment data provided
  if (!assessment) return null;

  const { status, label, score } = assessment;

  // Case 1: Checking in progress
  if (status === 'CHECKING') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-soft)',
          padding: '0.15rem 0.5rem',
          borderRadius: 'var(--radius-pill)',
          verticalAlign: 'middle',
          ...style
        }}
      >
        <span aria-hidden="true">⭐</span>
        <span>Website: Checking...</span>
      </span>
    );
  }

  // Case 2: Missing website or insufficient evidence
  if (status === 'NO_WEBSITE' || status === 'INSUFFICIENT' || !score) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-soft)',
          padding: '0.15rem 0.5rem',
          borderRadius: 'var(--radius-pill)',
          verticalAlign: 'middle',
          ...style
        }}
      >
        <span>Website: Not enough data</span>
      </span>
    );
  }

  // Case 3: Real score calculated from website assessment
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--primary-rose-dark)',
        backgroundColor: 'var(--primary-rose-tint)',
        padding: '0.15rem 0.55rem',
        borderRadius: 'var(--radius-pill)',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        ...style
      }}
      title={`Website assessment score: ${label}`}
    >
      <span aria-hidden="true">⭐</span>
      <span>Website {label}</span>
    </span>
  );
};
