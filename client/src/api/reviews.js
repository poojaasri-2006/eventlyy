import API_BASE_URL from '../config';

const BASE_URL = `${API_BASE_URL}/api/reviews`;

/**
 * Submit a new review for a completed booking.
 * @param {{ bookingId: string, rating: number, title?: string, comment: string }} payload
 * @param {string} token - Bearer JWT token
 */
export const createReview = async (payload, token) => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to submit review');
  }
  return data;
};

/**
 * Update an existing review by its ID.
 * @param {string} reviewId
 * @param {{ rating?: number, title?: string, comment?: string }} payload
 * @param {string} token - Bearer JWT token
 */
export const updateReview = async (reviewId, payload, token) => {
  const res = await fetch(`${BASE_URL}/${reviewId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update review');
  }
  return data;
};

/**
 * Fetch paginated reviews and stats for a vendor (public).
 * @param {string} vendorId
 * @param {{ page?: number, limit?: number }} options
 */
export const getVendorReviews = async (vendorId, { page = 1, limit = 5 } = {}) => {
  const res = await fetch(`${BASE_URL}/vendor/${vendorId}?page=${page}&limit=${limit}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load vendor reviews');
  }
  return data;
};

/**
 * Fetch the authenticated organizer's submitted reviews and eligible completed bookings.
 * @param {string} token - Bearer JWT token
 */
export const getOrganizerReviews = async (token) => {
  const res = await fetch(`${BASE_URL}/organizer`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load your reviews');
  }
  return data;
};

/**
 * Fetch review stats and list for the authenticated vendor's dashboard.
 * @param {string} token - Bearer JWT token
 */
export const getVendorDashboardReviews = async (token) => {
  const res = await fetch(`${BASE_URL}/vendor-dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load vendor reviews');
  }
  return data;
};
