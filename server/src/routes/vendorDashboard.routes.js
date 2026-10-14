const express = require('express');
const router = express.Router();

const { getVendorDashboard } = require('../controllers/vendorDashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getVendorDashboard);

module.exports = router;
