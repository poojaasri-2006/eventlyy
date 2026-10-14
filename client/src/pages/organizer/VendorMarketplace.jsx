import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Search } from 'lucide-react';
import { VendorRating, VendorWebsiteLink, VendorWebsiteAssessmentRating } from '../../components/VendorRating';

export const VendorMarketplace = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [events, setEvents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Recommended');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [vendorsRes, categoriesRes, shortlistsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vendors`, { headers }),
        fetch(`${API_BASE_URL}/api/vendors/categories`, { headers }),
        fetch(`${API_BASE_URL}/api/shortlist`, { headers }),
        fetch(`${API_BASE_URL}/api/events`, { headers })
      ]);

      if (!vendorsRes.ok) throw new Error('Failed to fetch vendors');
      
      const [vendorsData, categoriesData, shortlistsData, eventsData] = await Promise.all([
        vendorsRes.json(),
        categoriesRes.ok ? categoriesRes.json() : [],
        shortlistsRes.ok ? shortlistsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : []
      ]);

      setVendors(vendorsData);
      setCategories(categoriesData);
      setShortlists(shortlistsData);
      setEvents(eventsData);
    } catch (err) {
      console.error(err);
      setError('Unable to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  const handleOpenShortlistModal = (vendorId) => {
    setSelectedVendorId(vendorId);
    setModalError('');
    setSelectedEventId(events.length > 0 ? events[0].id : '');
    setShowModal(true);
  };

  const handleShortlist = async () => {
    if (!selectedEventId) {
      setModalError('Please select an event.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/shortlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          vendorId: selectedVendorId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error adding to shortlist');
      }

      const newShortlist = await res.json();
      setShortlists([...shortlists, newShortlist]);
      setShowModal(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Process and filter vendors
  const getVendorRating = (vendor) => {
    return Number.isFinite(vendor.averageRating) ? vendor.averageRating : 0;
  };

  const getStartingPrice = (vendor) => {
    const prices = [];
    if (vendor.packages && vendor.packages.length > 0) {
      prices.push(...vendor.packages.map(p => p.price));
    }
    if (vendor.services && vendor.services.length > 0) {
      prices.push(...vendor.services.filter(s => s.price).map(s => s.price));
    }
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const isShortlisted = (vendorId) => {
    return shortlists.some(s => s.vendorId === vendorId);
  };

  let filteredVendors = vendors.filter(vendor => {
    // Search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      vendor.businessName.toLowerCase().includes(searchLower) ||
      (vendor.category?.name || '').toLowerCase().includes(searchLower);
    
    // Category
    const matchesCategory = categoryFilter === 'All' || vendor.categoryId === categoryFilter || vendor.category?.name === categoryFilter;

    // Location
    const matchesLocation = !locationFilter || (vendor.description || '').toLowerCase().includes(locationFilter.toLowerCase());

    // Rating
    const rating = getVendorRating(vendor);
    let matchesRating = true;
    if (ratingFilter === '4+') matchesRating = rating >= 4;
    if (ratingFilter === '3+') matchesRating = rating >= 3;
    if (ratingFilter === '2+') matchesRating = rating >= 2;

    return matchesSearch && matchesCategory && matchesLocation && matchesRating;
  });

  // Sort
  if (sortOrder === 'Rating: High to Low') {
    filteredVendors.sort((a, b) => getVendorRating(b) - getVendorRating(a));
  } else if (sortOrder === 'Price: Low to High') {
    filteredVendors.sort((a, b) => {
      const priceA = getStartingPrice(a) || Infinity;
      const priceB = getStartingPrice(b) || Infinity;
      return priceA - priceB;
    });
  } else if (sortOrder === 'Price: High to Low') {
    filteredVendors.sort((a, b) => {
      const priceA = getStartingPrice(a) || 0;
      const priceB = getStartingPrice(b) || 0;
      return priceB - priceA;
    });
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchInitialData}>Try Again</Button>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>No vendors are available yet.</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please check back later.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Find Vendors</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Discover trusted vendors for your event.</p>
        
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <Input 
            placeholder="Search vendors by name or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem', width: '100%', backgroundColor: 'var(--card-white)' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', '@media (min-width: 768px)': { flexDirection: 'row' } }}>
        
        {/* Filters Sidebar */}
        <div style={{ flex: '0 0 250px' }}>
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Filters</h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Category</label>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
                style={{ width: '100%', backgroundColor: 'var(--surface-soft)', appearance: 'none' }}
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Location</label>
              <Input 
                placeholder="Enter location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{ width: '100%', backgroundColor: 'var(--surface-soft)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Rating</label>
              <select 
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="input"
                style={{ width: '100%', backgroundColor: 'var(--surface-soft)', appearance: 'none' }}
              >
                <option value="All">All Ratings</option>
                <option value="4+">4+ Stars</option>
                <option value="3+">3+ Stars</option>
                <option value="2+">2+ Stars</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Sort By</label>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input"
                style={{ width: '100%', backgroundColor: 'var(--surface-soft)', appearance: 'none' }}
              >
                <option value="Recommended">Recommended</option>
                <option value="Rating: High to Low">Rating: High to Low</option>
                <option value="Price: Low to High">Price: Low to High</option>
                <option value="Price: High to Low">Price: High to Low</option>
              </select>
            </div>
          </Card>
        </div>

        {/* Vendor Grid */}
        <div style={{ flex: 1 }}>
          {filteredVendors.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredVendors.map(vendor => {
                const startingPrice = getStartingPrice(vendor);
                const shortlisted = isShortlisted(vendor.id);

                return (
                  <Card key={vendor.id} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {vendor.imageUrl ? (
                        <img
                          src={vendor.imageUrl}
                          alt={vendor.businessName}
                          style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--primary-rose-tint)' }}
                        />
                      ) : (
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.2rem', flexShrink: 0 }}>
                          {vendor.businessName.charAt(0)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', rowGap: '0.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vendor.businessName}</h3>
                          <VendorWebsiteAssessmentRating assessment={vendor.websiteAssessment} />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary-rose)', fontWeight: '500', marginTop: '0.15rem' }}>
                          {vendor.category?.name || 'Vendor'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                      <VendorRating averageRating={vendor.averageRating} reviewCount={vendor.reviewCount} style={{ marginBottom: '0.5rem' }} />
                      {vendor.website && <div style={{ marginBottom: '0.5rem' }}><VendorWebsiteLink website={vendor.website} /></div>}
                      {(vendor.city || vendor.state) && (
                        <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          📍 {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {startingPrice !== null && <div style={{ marginBottom: '0.5rem' }}><strong>Starting at:</strong> ${startingPrice}</div>}
                      <p style={{ margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {vendor.description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <Button variant="outline" onClick={() => navigate(`/organizer/vendors/${vendor.id}`)}>
                        View Details
                      </Button>
                      <Button 
                        variant={shortlisted ? "outline" : "primary"} 
                        onClick={() => !shortlisted && handleOpenShortlistModal(vendor.id)}
                        style={shortlisted ? { backgroundColor: 'var(--success-sage)', color: 'white', borderColor: 'var(--success-sage)' } : {}}
                      >
                        {shortlisted ? 'Shortlisted' : 'Add to Shortlist'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--card-white)', borderRadius: 'var(--radius-large)' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No vendors found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Try changing your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shortlist Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Select Event to Shortlist</h3>
            
            {modalError && (
              <div style={{ color: 'var(--primary-rose-dark)', backgroundColor: 'var(--primary-rose-tint)', padding: '0.75rem', borderRadius: 'var(--radius-normal)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {modalError}
              </div>
            )}

            {events.length > 0 ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Event</label>
                <select 
                  className="input" 
                  style={{ width: '100%', appearance: 'none', backgroundColor: 'var(--surface-soft)' }}
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You must create an event before shortlisting vendors.</p>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={modalLoading}>Cancel</Button>
              {events.length > 0 && (
                <Button variant="primary" onClick={handleShortlist} disabled={modalLoading}>
                  {modalLoading ? 'Adding...' : 'Confirm'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .flex-col-md-row {
            flex-direction: row !important;
          }
        }
      `}</style>
    </div>
  );
};
