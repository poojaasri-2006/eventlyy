import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Globe,
  FileText,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  ThumbsUp,
  AlertOctagon,
  MessageSquare
} from 'lucide-react';

/**
 * Visual styling configuration for the 4 core authenticity assessments:
 * - Likely Genuine
 * - Needs Review
 * - Potentially Fake
 * - Unable to Verify
 */
const ASSESSMENT_CONFIG = {
  LIKELY_GENUINE: {
    label: 'Likely Genuine',
    subtitle: 'Available evidence is consistent and required verification checks have passed.',
    bg: '#edf7ed',
    border: '#c8e6c9',
    color: '#2e7d32',
    badgeBg: '#8fae9a',
    badgeColor: '#ffffff',
    icon: ShieldCheck,
    bannerDesc: 'Profile information, official website presence, and contact details match consistently.'
  },
  NEEDS_REVIEW: {
    label: 'Needs Review',
    subtitle: 'Evidence is incomplete, conflicting, or contains items requiring organizer inspection.',
    bg: '#fff8e1',
    border: '#ffe082',
    color: '#b78103',
    badgeBg: '#f6e7e8',
    badgeColor: '#9d4f5a',
    icon: AlertTriangle,
    bannerDesc: 'Certain details require organizer scrutiny, such as missing documentation or unverified contact data.'
  },
  POTENTIALLY_FAKE: {
    label: 'Potentially Fake',
    subtitle: 'Multiple significant, evidence-based warning signs have been detected.',
    bg: '#fdebee',
    border: '#ffcdd2',
    color: '#c62828',
    badgeBg: '#9d4f5a',
    badgeColor: '#ffffff',
    icon: ShieldAlert,
    bannerDesc: 'Substantial warning indicators detected, such as distinct business identity or domain discrepancies.'
  },
  UNABLE_TO_VERIFY: {
    label: 'Unable to Verify',
    subtitle: 'The website or available evidence could not be checked sufficiently.',
    bg: '#f5f5f5',
    border: '#e0e0e0',
    color: '#616161',
    badgeBg: '#e8e2e2',
    badgeColor: '#4f4647',
    icon: HelpCircle,
    bannerDesc: 'Inconclusive results: website is missing or inaccessible, or external records could not be retrieved.'
  }
};

const CHECK_STATUS_CONFIG = {
  PASSED: {
    label: 'Passed',
    icon: CheckCircle2,
    color: '#2e7d32',
    bg: '#e8f5e9'
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    color: '#b78103',
    bg: '#fff9c4'
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    color: '#c62828',
    bg: '#ffebee'
  },
  NOT_CHECKED: {
    label: 'Not Checked',
    icon: MinusCircle,
    color: '#757575',
    bg: '#eeeeee'
  }
};

export const VendorAuthenticitySection = ({
  vendor,
  verificationData,
  loading,
  onRefresh,
  refreshing,
  onPerformAction,
  actionLoading
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [activeActionModal, setActiveActionModal] = useState(null); // 'REVIEWED' | 'APPROVED' | 'INFO_REQUESTED' | 'REJECTED'
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionError, setActionError] = useState('');

  const verification = verificationData?.verification;
  const assessmentKey = verification?.assessment || 'UNABLE_TO_VERIFY';
  const config = ASSESSMENT_CONFIG[assessmentKey] || ASSESSMENT_CONFIG.UNABLE_TO_VERIFY;
  const AssessmentIcon = config.icon;

  const checks = verification?.checks || [];
  const reasons = verification?.reasons || [];
  const missingEvidence = verification?.missingEvidence || [];
  const suspiciousIndicators = verification?.suspiciousIndicators || [];
  const extractedData = verification?.extractedData || null;

  const lastCheckedAt = verification?.lastCheckedAt
    ? new Date(verification.lastCheckedAt).toLocaleString()
    : null;
  const isFresh = verificationData?.isFresh ?? true;

  const handleOpenActionModal = (actionType) => {
    setActiveActionModal(actionType);
    setActionReason('');
    setActionNotes('');
    setActionError('');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (activeActionModal === 'REJECTED' && !actionReason.trim()) {
      setActionError('Please provide a documented reason for rejection.');
      return;
    }

    try {
      await onPerformAction(activeActionModal, actionReason, actionNotes);
      setActiveActionModal(null);
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    }
  };

  return (
    <Card style={{ padding: '2rem', border: `1.5px solid ${config.border}`, backgroundColor: '#ffffff' }}>
      {/* Top Banner Assessment */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        padding: '1.25rem 1.5rem',
        backgroundColor: config.bg,
        borderRadius: 'var(--radius-normal)',
        border: `1px solid ${config.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <AssessmentIcon size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Authenticity Assessment
              </span>
              <span style={{
                backgroundColor: config.badgeBg,
                color: config.badgeColor,
                padding: '0.2rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {config.label}
              </span>
              {verification?.decisionStatus && verification.decisionStatus !== 'PENDING' && (
                <span style={{
                  backgroundColor: 'var(--primary-rose-tint)',
                  color: 'var(--primary-rose-dark)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  Decision: {verification.decisionStatus.replace('_', ' ')}
                </span>
              )}
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '500' }}>
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Refresh / Timestamp Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {lastCheckedAt ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                <Clock size={13} />
                <span>Checked: {lastCheckedAt}</span>
              </div>
            ) : (
              <span>Verification active</span>
            )}
            <div>
              {isFresh ? (
                <span style={{ color: '#2e7d32', fontWeight: '600' }}>● Current & Fresh</span>
              ) : (
                <span style={{ color: '#b78103', fontWeight: '600' }}>● Stale (Refresh Available)</span>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing || loading}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Re-verify'}
          </Button>
        </div>
      </div>

      {/* Primary Assessment Summary & Reasons */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Assessment Summary & Findings
        </h3>
        <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1rem' }}>
          {verification?.summary || config.bannerDesc}
        </p>

        {/* Reasons bullets */}
        {reasons.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Key Assessment Reasons:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {reasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning signs & Missing evidence side-by-side if present */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {suspiciousIndicators.length > 0 && (
            <div style={{ backgroundColor: '#fff8f6', border: '1px solid #ffcdd2', borderRadius: 'var(--radius-normal)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c62828', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <AlertOctagon size={16} /> Attention Indicators ({suspiciousIndicators.length})
              </div>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>
                {suspiciousIndicators.map((ind, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{ind}</li>
                ))}
              </ul>
            </div>
          )}

          {missingEvidence.length > 0 && (
            <div style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 'var(--radius-normal)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#616161', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <Info size={16} /> Missing Supporting Evidence ({missingEvidence.length})
              </div>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>
                {missingEvidence.map((m, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Individual Evidence Checks Table / List */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
            Individual Evidence Checks ({checks.length})
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-rose)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.9rem'
            }}
          >
            {showDetails ? 'Hide Detailed Evidence' : 'Show Detailed Evidence'}
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {checks.map((chk) => {
            const statusCfg = CHECK_STATUS_CONFIG[chk.status] || CHECK_STATUS_CONFIG.NOT_CHECKED;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={chk.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  border: '1px solid var(--surface-soft)',
                  borderRadius: 'var(--radius-normal)',
                  backgroundColor: 'var(--card-white)',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <StatusIcon size={18} color={statusCfg.color} />
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {chk.label}
                    </span>
                  </div>
                  <span style={{
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.color,
                    padding: '0.15rem 0.6rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {statusCfg.label}
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0 1.8rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  {chk.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Extracted Details from Website */}
      {showDetails && extractedData && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.25rem',
          backgroundColor: 'var(--surface-soft)',
          borderRadius: 'var(--radius-normal)',
          fontSize: '0.88rem'
        }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-rose-dark)' }}>
            Captured Website Intelligence
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Page Title:</strong>
              <div style={{ color: 'var(--text-primary)' }}>{extractedData.title || 'None found'}</div>
            </div>
            <div>
              <strong>Emails Found on Site:</strong>
              <div style={{ color: 'var(--text-primary)' }}>
                {extractedData.emailsFound?.length > 0 ? extractedData.emailsFound.join(', ') : 'None detected'}
              </div>
            </div>
            <div>
              <strong>Phones Found on Site:</strong>
              <div style={{ color: 'var(--text-primary)' }}>
                {extractedData.phonesFound?.length > 0 ? extractedData.phonesFound.slice(0, 4).join(', ') : 'None detected'}
              </div>
            </div>
            <div>
              <strong>Social Channels:</strong>
              <div style={{ color: 'var(--text-primary)' }}>
                {extractedData.socialLinks?.length > 0 ? extractedData.socialLinks.length + ' detected' : 'None detected'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizer Decision & Actions Section */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--surface-soft)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>
            Organizer Verification Actions
          </h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Decisions are recorded separately from automated checks. Automated assessments do not silently approve or reject vendors.
          </p>
          {verification?.decisionReason && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-normal)' }}>
              <strong>Documented note:</strong> {verification.decisionReason}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            onClick={() => handleOpenActionModal('REVIEWED')}
            disabled={actionLoading}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Mark as Reviewed
          </Button>
          <Button
            variant="primary"
            onClick={() => handleOpenActionModal('APPROVED')}
            disabled={actionLoading}
            style={{ backgroundColor: 'var(--success-sage)', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Approve Verification
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenActionModal('INFO_REQUESTED')}
            disabled={actionLoading}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Request Info
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenActionModal('REJECTED')}
            disabled={actionLoading}
            style={{ borderColor: '#c62828', color: '#c62828', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Reject Verification
          </Button>
        </div>
      </div>

      {/* Action Dialog Modal */}
      {activeActionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <Card style={{ width: '90%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {activeActionModal === 'REVIEWED' && 'Mark Vendor as Reviewed'}
              {activeActionModal === 'APPROVED' && 'Approve Vendor Verification'}
              {activeActionModal === 'INFO_REQUESTED' && 'Request Additional Information'}
              {activeActionModal === 'REJECTED' && 'Reject Vendor Verification'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {activeActionModal === 'APPROVED' && 'This marks the vendor as manually approved for upcoming events.'}
              {activeActionModal === 'REVIEWED' && 'Logs that an organizer has inspected this profile.'}
              {activeActionModal === 'INFO_REQUESTED' && 'Send a request asking the vendor to provide missing certificates or documentation.'}
              {activeActionModal === 'REJECTED' && 'Reject verification for this vendor. A documented reason is required.'}
            </p>

            {actionError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitAction}>
              {(activeActionModal === 'REJECTED' || activeActionModal === 'INFO_REQUESTED') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    {activeActionModal === 'REJECTED' ? 'Reason for Rejection *' : 'Information Requested *'}
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={activeActionModal === 'REJECTED' ? 'Document the specific inconsistencies or failure reasons...' : 'Specify which registration documents, tax IDs, or portfolio links are needed...'}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                  Internal Organizer Notes (Optional)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Optional internal comments for your team..."
                  style={{ width: '100%', resize: 'vertical' }}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Button variant="outline" type="button" onClick={() => setActiveActionModal(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={actionLoading}
                  style={activeActionModal === 'REJECTED' ? { backgroundColor: '#c62828' } : activeActionModal === 'APPROVED' ? { backgroundColor: 'var(--success-sage)' } : {}}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};
