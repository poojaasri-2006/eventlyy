const express = require('express');
const router = express.Router();

const {
  getBookings,
  getBookingById
} = require('../controllers/bookings.controller');
const { authMiddleware, requireVendor } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, requireVendor, getBookings);
router.get('/:id', authMiddleware, requireVendor, getBookingById);

module.exports = router;
