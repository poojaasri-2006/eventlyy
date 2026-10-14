import API_BASE_URL from '../config';

const API_URL = `${API_BASE_URL}/api`;

export const cancelBooking = async (bookingId, token) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'CANCELLED' })
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Unable to cancel this booking.');
  }

  return result;
};
