const express = require('express');
const router = express.Router();
const {
  getVendorRequests,
  getVendorRequestById,
  updateRequestStatus
} = require('../controllers/vendorRequests.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getVendorRequests);
router.get('/:id', authMiddleware, getVendorRequestById);
router.patch('/:id/status', authMiddleware, updateRequestStatus);

module.exports = router;
