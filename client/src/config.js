// Central API configuration
// In development: http://localhost:5000
// In production: Set VITE_API_URL environment variable to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE_URL;
