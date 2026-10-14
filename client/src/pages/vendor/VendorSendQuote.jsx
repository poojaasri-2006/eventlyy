import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import {
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Send,
  Package,
  Briefcase,
  Edit3,
  Eye,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

export const VendorSendQuote = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Resolve target inquiryId from param :id, :inquiryId, query param ?inquiryId=..., or location.state
  const targetInquiryId = params.inquiryId || params.id || searchParams.get('inquiryId') || location.state?.inquiryId || null;

  // Active view: 'FORM' when quoting for an inquiry, 'LIST' when browsing all quotes
  const [activeTab, setActiveTab] = useState(targetInquiryId ? 'FORM' : 'LIST');

  // Selected inquiry for quoting
  const [currentInquiryId, setCurrentInquiryId] = useState(targetInquiryId);
  const [inquiryData, setInquiryData] = useState(null);
  const [loadingInquiry, setLoadingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState(null);

  // Vendor's packages & services for auto-filling
  const [vendorPackages, setVendorPackages] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);

  // All quotes & pending inquiries for dashboard view
  const [quotesList, setQuotesList] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quote Form State
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteScope, setQuoteScope] = useState('');
  const [quoteValidity, setQuoteValidity] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [existingQuoteId, setExistingQuoteId] = useState(null);
  const [existingQuoteStatus, setExistingQuoteStatus] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Sync currentInquiryId when URL changes
  useEffect(() => {
    if (targetInquiryId) {
      setCurrentInquiryId(targetInquiryId);
      setActiveTab('FORM');
      setSubmitSuccess(null);
    }
  }, [targetInquiryId]);

  // Fetch Vendor Packages & Services once for quick-populate
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [pkgRes, svcRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vendor/packages`, { headers }),
          fetch(`${API_BASE_URL}/api/vendor/services`, { headers })
        ]);
        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          setVendorPackages(pkgData);
        }
        if (svcRes.ok) {
          const svcData = await svcRes.json();
          setVendorServices(svcData);
        }
      } catch (err) {
        console.error('[Catalog Fetch Error]', err);
      }
    };

    if (token) {
      fetchCatalog();
    }
  }, [token]);

  // Fetch Quotes List & Requests for the Dashboard
  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      const headers = { Authorization: `Bearer ${token}` };

      const [quotesRes, reqsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/quotes`, { headers }),
        fetch(`${API_BASE_URL}/api/vendor/requests`, { headers })
      ]);

      if (quotesRes.ok) {
        const qData = await quotesRes.json();
        setQuotesList(qData);
      } else {
        throw new Error('Failed to load submitted quotes');
      }

      if (reqsRes.ok) {
        const rData = await reqsRes.json();
        setAllRequests(rData);
      }
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'LIST') {
      fetchDashboardData();
    }
  }, [token, activeTab]);

  // Fetch Specific Inquiry Data when currentInquiryId is set
  const fetchInquiryDetails = async (id) => {
    try {
      setLoadingInquiry(true);
      setInquiryError(null);
      setSubmitError(null);

      const res = await fetch(`${API_BASE_URL}/api/vendor/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to fetch request details');
      }

      const data = await res.json();
      setInquiryData(data);

      // Check if inquiry already has an attached quote
      if (data.quote) {
        setExistingQuoteId(data.quote.id);
        setExistingQuoteStatus(data.quote.status);
        setQuoteAmount(data.quote.totalAmount ? String(data.quote.totalAmount) : '');

        // Parse details if structured or use plain text
        const detailsText = data.quote.details || '';
        setQuoteScope(detailsText);
      } else {
        setExistingQuoteId(null);
        setExistingQuoteStatus(null);
        setQuoteAmount('');
        setQuoteScope('');
        setQuoteValidity('');
        setAdditionalTerms('');
      }
    } catch (err) {
      setInquiryError(err.message);
    } finally {
      setLoadingInquiry(false);
    }
  };

  useEffect(() => {
    if (token && currentInquiryId) {
      fetchInquiryDetails(currentInquiryId);
    }
  }, [token, currentInquiryId]);

  // Package / Service Quick Populate Handlers
  const handleSelectPackage = (pkg) => {
    setQuoteAmount(String(pkg.price));
    let description = `Package: ${pkg.name}\n${pkg.description || ''}\n\nIncluded Services:\n`;
    if (pkg.services && pkg.services.length > 0) {
      pkg.services.forEach((s) => {
        description += `• ${s.name}${s.price ? ` ($${s.price})` : ''}\n`;
      });
    } else {
      description += '• Full package deliverables as agreed\n';
    }
    setQuoteScope(description.trim());
  };

  const handleSelectService = (svc) => {
    if (!quoteAmount || quoteAmount === '0') {
      setQuoteAmount(svc.price ? String(svc.price) : '');
    }
    const addition = `Service: ${svc.name} - $${svc.price || 0}${svc.description ? ` (${svc.description})` : ''}`;
    setQuoteScope(prev => prev ? `${prev}\n• ${addition}` : `• ${addition}`);
  };

  // Handle Form Submission
  const handleSubmitQuote = async (e) => {
    e.preventDefault();

    if (!currentInquiryId) {
      setSubmitError('Select a vendor request before submitting a quote.');
      return;
    }

    if (!quoteAmount || parseFloat(quoteAmount) <= 0) {
      setSubmitError('Please enter a valid quote amount greater than $0.');
      return;
    }

    if (!quoteScope.trim()) {
      setSubmitError('Please enter the quote scope and deliverable details.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      // Construct final details string including optional terms and validity
      let finalDetails = quoteScope.trim();
      const metaParts = [];
      if (quoteValidity.trim()) {
        metaParts.push(`Quote Validity: ${quoteValidity.trim()}`);
      }
      if (additionalTerms.trim()) {
        metaParts.push(`Additional Terms & Notes: ${additionalTerms.trim()}`);
      }
      if (metaParts.length > 0) {
        finalDetails += `\n\n--- Terms & Conditions ---\n${metaParts.join('\n')}`;
      }

      let res;
      if (existingQuoteId) {
        // Edit existing quote
        res = await fetch(`${API_BASE_URL}/api/quotes/${existingQuoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            totalAmount: parseFloat(quoteAmount),
            details: finalDetails
          })
        });
      } else {
        // Submit new quote
        res = await fetch(`${API_BASE_URL}/api/quotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            inquiryId: currentInquiryId,
            totalAmount: parseFloat(quoteAmount),
            details: finalDetails
          })
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit quote');
      }

      const savedQuote = await res.json();
      setExistingQuoteId(savedQuote.id);
      setExistingQuoteStatus(savedQuote.status);
      setSubmitSuccess({
        message: existingQuoteId
          ? 'Quote successfully updated and synchronized!'
          : 'Professional quote sent to the event organizer!',
        amount: savedQuote.totalAmount,
        quoteId: savedQuote.id
      });

      await Promise.all([
        fetchInquiryDetails(currentInquiryId),
        fetchDashboardData()
      ]);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={12} /> Pending Review
          </span>
        );
      case 'ACCEPTED':
        return (
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={12} /> Accepted by Organizer
          </span>
        );
      case 'REJECTED':
      case 'DECLINED':
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
            {status}
          </span>
        );
    }
  };

  // Filtered quotes for list view
  const filteredQuotes = quotesList.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const eventTitle = q.inquiry?.event?.title?.toLowerCase() || '';
      const organizerName = `${q.inquiry?.event?.organizer?.firstName || ''} ${q.inquiry?.event?.organizer?.lastName || ''}`.toLowerCase();
      const details = q.details?.toLowerCase() || '';
      return eventTitle.includes(qLower) || organizerName.includes(qLower) || details.includes(qLower);
    }
    return true;
  });

  // Inquiries awaiting quotes (status !== 'DECLINED' and no quote attached)
  const inquiriesAwaitingQuote = allRequests.filter(
    (r) => r.status !== 'DECLINED' && (!r.quote || !quotesList.some(q => q.inquiryId === r.id))
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: '700' }}>
            {activeTab === 'FORM' ? 'Prepare & Send Quote' : 'Vendor Quotes'}
          </h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {activeTab === 'FORM'
              ? 'Send customized, professional pricing and deliverables to event organizers.'
              : 'Track, manage, and review all quotations submitted for event inquiries.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--card-white)', padding: '0.3rem', borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-sm)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              backgroundColor: activeTab === 'LIST' ? 'var(--primary-rose)' : 'transparent',
              color: activeTab === 'LIST' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={15} /> All Quotes ({quotesList.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('FORM');
              if (!currentInquiryId && inquiriesAwaitingQuote.length > 0) {
                setCurrentInquiryId(inquiriesAwaitingQuote[0].id);
              }
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              backgroundColor: activeTab === 'FORM' ? 'var(--primary-rose)' : 'transparent',
              color: activeTab === 'FORM' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={15} /> {currentInquiryId ? 'Quote Editor' : 'New Quote'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: QUOTES DASHBOARD & LIST VIEW                     */}
      {/* ======================================================== */}
      {activeTab === 'LIST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose)', padding: '0.75rem', borderRadius: 'var(--radius-normal)' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {quotesList.length}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Quotes Sent</div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.75rem', borderRadius: 'var(--radius-normal)' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {quotesList.filter(q => q.status === 'PENDING').length}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Review</div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.75rem', borderRadius: 'var(--radius-normal)' }}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {quotesList.filter(q => q.status === 'ACCEPTED').length}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Accepted Quotes</div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '0.75rem', borderRadius: 'var(--radius-normal)' }}>
                  <DollarSign size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    ${quotesList.reduce((sum, q) => sum + (q.totalAmount || 0), 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Quoted Value</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section: Inquiries Awaiting Quotes (if any) */}
          {inquiriesAwaitingQuote.length > 0 && (
            <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-rose)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--primary-rose)' }} /> Inquiries Ready for Quotation ({inquiriesAwaitingQuote.length})
                </h3>
                <Link to="/vendor/requests" style={{ fontSize: '0.85rem', color: 'var(--primary-rose)', textDecoration: 'none', fontWeight: '600' }}>
                  View All Requests &rarr;
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {inquiriesAwaitingQuote.slice(0, 3).map((req) => (
                  <div key={req.id} style={{ backgroundColor: 'var(--surface-soft)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-normal)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {req.event?.title || 'Event Inquiry'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Organizer: {req.event?.organizer?.firstName || 'Client'}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setCurrentInquiryId(req.id);
                        setActiveTab('FORM');
                      }}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      Quote Now
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filter & Search Bar */}
          <Card style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      backgroundColor: statusFilter === status ? 'var(--primary-rose)' : 'var(--surface-soft)',
                      color: statusFilter === status ? '#fff' : 'var(--text-primary)',
                      fontWeight: '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search quotes by event or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.85rem 0.45rem 2.3rem',
                    border: '1px solid var(--surface-soft)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Quotes List */}
          {loadingDashboard ? (
            <LoadingState message="Loading your submitted quotes..." />
          ) : dashboardError ? (
            <Card style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
              <div>{dashboardError}</div>
              <Button variant="outline" onClick={fetchDashboardData} style={{ marginTop: '1rem' }}>
                Try Again
              </Button>
            </Card>
          ) : filteredQuotes.length === 0 ? (
            <Card style={{ padding: '3rem', textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>No Quotes Found</h3>
              <p style={{ margin: '0.5rem 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No quotes match your selected filters.'
                  : 'You have not submitted any quotes yet. Inquiries from event organizers will appear here.'}
              </p>
              <Link to="/vendor/requests">
                <Button variant="primary">Browse Event Inquiries</Button>
              </Link>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredQuotes.map((q) => {
                const event = q.inquiry?.event;
                const organizer = event?.organizer;
                const organizerName = organizer ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() : 'Event Organizer';

                return (
                  <Card key={q.id} style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {event?.title || 'Event Quote'}
                          </h3>
                          {renderStatusBadge(q.status)}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Sent to <strong>{organizerName}</strong> on {new Date(q.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Quote Amount</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-rose)' }}>
                          ${q.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Event summary pill row */}
                    {event && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-soft)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-normal)' }}>
                        {event.date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} style={{ color: 'var(--primary-rose)' }} />
                            <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          </div>
                        )}
                        {event.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={14} style={{ color: 'var(--primary-rose)' }} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {organizer?.user?.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Mail size={14} style={{ color: 'var(--primary-rose)' }} />
                            <span>{organizer.user.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Itemized Deliverables Box */}
                    <div style={{ marginBottom: '1.25rem', backgroundColor: '#fafafa', padding: '0.85rem 1rem', borderRadius: 'var(--radius-normal)', border: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Deliverables & Quote Scope:
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                        {q.details}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                      {q.status === 'PENDING' ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCurrentInquiryId(q.inquiryId);
                            setActiveTab('FORM');
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                        >
                          <Edit3 size={15} /> Edit Pending Quote
                        </Button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Quote finalized ({q.status.toLowerCase()})
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: QUOTE PREPARATION & EDITING WORKSPACE            */}
      {/* ======================================================== */}
      {activeTab === 'FORM' && (
        <div>

          {/* Back button & Inquiry Picker (if no inquiry selected) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('LIST')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--primary-rose)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              <ArrowLeft size={16} /> Back to All Quotes
            </button>

            {/* Inquiry Selector dropdown if multiple inquiries exist */}
            {allRequests.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Request:</span>
                <select
                  value={currentInquiryId || ''}
                  onChange={(e) => setCurrentInquiryId(e.target.value)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-normal)',
                    border: '1px solid var(--surface-soft)',
                    backgroundColor: '#fff',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="" disabled>-- Select an Inquiry --</option>
                  {allRequests
                    .filter(r => r.status !== 'DECLINED')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.event?.title || 'Event'} - {r.event?.organizer?.firstName || 'Organizer'} ({r.quote ? 'Quote Sent' : 'No Quote'})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {!currentInquiryId ? (
            <Card style={{ padding: '3rem', textAlign: 'center' }}>
              <Layers size={48} style={{ color: 'var(--primary-rose)', margin: '0 auto 1rem', opacity: 0.8 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: '600' }}>
                Select an Organizer Request to Quote
              </h3>
              <p style={{ margin: '0.5rem auto 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px' }}>
                Quotes must be linked to a genuine organizer request. Select an inquiry from your inbox to open the quoting workspace.
              </p>
              <Link to="/vendor/requests">
                <Button variant="primary">Browse Vendor Requests</Button>
              </Link>
            </Card>
          ) : loadingInquiry ? (
            <LoadingState message="Loading organizer request details..." />
          ) : inquiryError ? (
            <Card style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
              <div>{inquiryError}</div>
              <Button variant="outline" onClick={() => fetchInquiryDetails(currentInquiryId)} style={{ marginTop: '1rem' }}>
                Retry
              </Button>
            </Card>
          ) : inquiryData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

              {/* LEFT COLUMN: Request & Event Context Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Event & Organizer Details */}
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary-rose)', fontWeight: '700' }}>
                        Inquiry Context
                      </span>
                      <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {inquiryData.event?.title || 'Event Inquiry'}
                      </h2>
                    </div>
                    {renderStatusBadge(inquiryData.status)}
                  </div>

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', padding: '0.85rem', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-normal)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{inquiryData.event?.date ? new Date(inquiryData.event.date).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'Date TBD'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{inquiryData.event?.location || 'Location to be determined'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={15} style={{ color: 'var(--primary-rose)' }} />
                      <span>{inquiryData.event?.organizer?.firstName} {inquiryData.event?.organizer?.lastName}</span>
                    </div>
                    {inquiryData.event?.organizer?.user?.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={15} style={{ color: 'var(--primary-rose)' }} />
                        <span>{inquiryData.event.organizer.user.email}</span>
                      </div>
                    )}
                    {inquiryData.event?.organizer?.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={15} style={{ color: 'var(--primary-rose)' }} />
                        <span>{inquiryData.event.organizer.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Organizer's Message */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Organizer's Message:
                    </div>
                    <div style={{ backgroundColor: '#fafafa', padding: '0.85rem', borderRadius: 'var(--radius-normal)', border: '1px solid #f3f4f6', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                      "{inquiryData.message}"
                    </div>
                  </div>

                  {/* Event Requirements Checklist (if any) */}
                  {inquiryData.event?.requirements && inquiryData.event.requirements.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        Event Requirements Checklist:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {inquiryData.event.requirements.map((req) => (
                          <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            <Check size={14} style={{ color: 'var(--primary-rose)' }} />
                            <span>{req.title} {req.category ? `(${req.category})` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Auto-Populate from Vendor Packages & Services */}
                {(vendorPackages.length > 0 || vendorServices.length > 0) && (
                  <Card style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>
                      <Sparkles size={16} style={{ color: 'var(--primary-rose)' }} />
                      Quick Import from Catalog
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Click any package or service to auto-fill description and suggested pricing:
                    </p>

                    {/* Packages chips */}
                    {vendorPackages.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                          My Packages:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {vendorPackages.map((pkg) => (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => handleSelectPackage(pkg)}
                              style={{
                                backgroundColor: 'var(--surface-soft)',
                                border: '1px solid var(--border-color, #e5e7eb)',
                                borderRadius: 'var(--radius-pill)',
                                padding: '0.3rem 0.75rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Package size={13} style={{ color: 'var(--primary-rose)' }} />
                              {pkg.name} (${pkg.price})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services chips */}
                    {vendorServices.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                          My Services:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {vendorServices.map((svc) => (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => handleSelectService(svc)}
                              style={{
                                backgroundColor: '#fff',
                                border: '1px solid var(--border-color, #e5e7eb)',
                                borderRadius: 'var(--radius-pill)',
                                padding: '0.3rem 0.75rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Briefcase size={13} style={{ color: 'var(--primary-rose)' }} />
                              {svc.name} {svc.price ? `($${svc.price})` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

              </div>

              {/* RIGHT COLUMN: Formal Quote Form */}
              <div>
                <Card style={{ padding: '1.75rem' }}>
                  
                  {/* Status indicator banner if quote exists */}
                  {existingQuoteId && (
                    <div style={{
                      backgroundColor: existingQuoteStatus === 'ACCEPTED' ? '#dcfce7' : existingQuoteStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                      color: existingQuoteStatus === 'ACCEPTED' ? '#15803d' : existingQuoteStatus === 'REJECTED' ? '#b91c1c' : '#b45309',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-normal)',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      {existingQuoteStatus === 'ACCEPTED' ? (
                        <>
                          <CheckCircle2 size={16} /> This quote has been accepted by the organizer!
                        </>
                      ) : existingQuoteStatus === 'REJECTED' ? (
                        <>
                          <XCircle size={16} /> This quote was rejected by the organizer.
                        </>
                      ) : (
                        <>
                          <Edit3 size={16} /> You have already submitted a pending quote. Modifying this form will update it.
                        </>
                      )}
                    </div>
                  )}

                  {/* Submission Error Banner */}
                  {submitError && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <AlertCircle size={16} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submission Success Banner */}
                  {submitSuccess && (
                    <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '1rem', borderRadius: 'var(--radius-normal)', marginBottom: '1.25rem', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                        <CheckCircle2 size={18} /> {submitSuccess.message}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: '0.75rem' }}>
                        Confirmed Amount: <strong>${submitSuccess.amount?.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline" onClick={() => setActiveTab('LIST')} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                          View Quotes List
                        </Button>
                        <Link to="/vendor/requests">
                          <Button variant="primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                            Back to Requests
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmitQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Section: Price */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        Total Quote Amount ($) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <DollarSign size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          disabled={existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' || submitting}
                          placeholder="e.g. 2500.00"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 2.4rem',
                            border: '1px solid var(--surface-soft)',
                            borderRadius: 'var(--radius-normal)',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            backgroundColor: existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' ? '#f9fafb' : '#fff'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Enter the total estimated cost for the requested services and deliverables.
                      </span>
                    </div>

                    {/* Section: Details / Deliverables Scope */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        Quote Details & Deliverables *
                      </label>
                      <textarea
                        rows="7"
                        required
                        disabled={existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' || submitting}
                        placeholder="Detail all services included, deliverables, timeline, milestones, crew, equipment..."
                        value={quoteScope}
                        onChange={(e) => setQuoteScope(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid var(--surface-soft)',
                          borderRadius: 'var(--radius-normal)',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          lineHeight: '1.5',
                          resize: 'vertical',
                          backgroundColor: existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' ? '#f9fafb' : '#fff'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Be as thorough and clear as possible so the organizer understands the value offered.
                      </span>
                    </div>

                    {/* Section: Quote Validity Period */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        Quote Validity (Optional)
                      </label>
                      <input
                        type="text"
                        disabled={existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' || submitting}
                        placeholder="e.g. Valid for 14 days, or until next month"
                        value={quoteValidity}
                        onChange={(e) => setQuoteValidity(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 1rem',
                          border: '1px solid var(--surface-soft)',
                          borderRadius: 'var(--radius-normal)',
                          fontSize: '0.9rem',
                          backgroundColor: existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' ? '#f9fafb' : '#fff'
                        }}
                      />
                    </div>

                    {/* Section: Additional Terms & Conditions */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        Additional Terms & Payment Notes (Optional)
                      </label>
                      <textarea
                        rows="3"
                        disabled={existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' || submitting}
                        placeholder="e.g. 50% deposit required upon confirmation. Balance due on event day. Cancellation policy..."
                        value={additionalTerms}
                        onChange={(e) => setAdditionalTerms(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 1rem',
                          border: '1px solid var(--surface-soft)',
                          borderRadius: 'var(--radius-normal)',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          backgroundColor: existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' ? '#f9fafb' : '#fff'
                        }}
                      />
                    </div>

                    {/* Submit Actions */}
                    {existingQuoteStatus === 'ACCEPTED' || existingQuoteStatus === 'REJECTED' ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        This quote is locked and cannot be updated.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setActiveTab('LIST')}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          type="submit"
                          disabled={submitting}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px', justifyContent: 'center' }}
                        >
                          {submitting ? (
                            'Submitting...'
                          ) : existingQuoteId ? (
                            <>
                              <Edit3 size={16} /> Update Quote
                            </>
                          ) : (
                            <>
                              <Send size={16} /> Send Quote to Organizer
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                  </form>
                </Card>
              </div>

            </div>
          ) : null}

        </div>
      )}

    </div>
  );
};
export default VendorSendQuote;
