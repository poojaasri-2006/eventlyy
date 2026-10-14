const express = require('express');
const router = express.Router();

const {
  getBookings,
  getBookingById,
  updateBookingStatus
} = require('../controllers/bookings.controller');
const { authMiddleware, requireOrganizer } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getBookings);
router.get('/:id', authMiddleware, getBookingById);
router.patch('/:id/status', authMiddleware, requireOrganizer, updateBookingStatus);

module.exports = router;
