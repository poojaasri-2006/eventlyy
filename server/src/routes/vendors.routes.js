const express = require('express');
const router = express.Router();

const { getVendors, getVendorCategories, getVendorById } = require('../controllers/vendors.controller');
const {
  getVendorAuthenticity,
  refreshVendorAuthenticity,
  performOrganizerVerificationAction,
  getVendorDocuments,
  addVendorDocument
} = require('../controllers/authenticity.controller');
const { authMiddleware, requireOrganizer } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getVendors);
router.get('/categories', authMiddleware, getVendorCategories);

// Authenticity & Verification routes
router.get('/:id/authenticity', authMiddleware, getVendorAuthenticity);
router.post('/:id/authenticity/refresh', authMiddleware, requireOrganizer, refreshVendorAuthenticity);
router.post('/:id/authenticity/action', authMiddleware, requireOrganizer, performOrganizerVerificationAction);
router.get('/:id/documents', authMiddleware, getVendorDocuments);
router.post('/:id/documents', authMiddleware, addVendorDocument);

router.get('/:id', authMiddleware, getVendorById);

module.exports = router;
