// Central API configuration
// In production (Vercel): defaults to '' (same domain — no CORS needed)
// In development: set VITE_API_URL=http://localhost:5000 in client/.env
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default API_BASE_URL;
