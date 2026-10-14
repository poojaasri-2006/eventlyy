const express = require('express');
const router = express.Router();
const { authMiddleware, requireOrganizer, requireVendor } = require('../middleware/auth.middleware');
const {
  getVendorReviews,
  getOrganizerReviews,
  createReview,
  updateReview,
  getVendorDashboardReviews
} = require('../controllers/reviews.controller');

// Public or authenticated: view vendor reviews
router.get('/vendor/:vendorId', getVendorReviews);

// Organizer routes
router.get('/organizer', authMiddleware, requireOrganizer, getOrganizerReviews);
router.post('/', authMiddleware, requireOrganizer, createReview);
router.put('/:id', authMiddleware, requireOrganizer, updateReview);

// Vendor routes
router.get('/vendor-dashboard', authMiddleware, requireVendor, getVendorDashboardReviews);

module.exports = router;
