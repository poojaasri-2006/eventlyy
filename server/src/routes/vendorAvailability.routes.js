const express = require('express');
const router = express.Router();
const {
  getAvailability,
  createOrUpdateAvailability,
  updateAvailability,
  deleteAvailability
} = require('../controllers/vendorAvailability.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getAvailability);
router.post('/', authMiddleware, createOrUpdateAvailability);
router.patch('/:id', authMiddleware, updateAvailability);
router.delete('/:id', authMiddleware, deleteAvailability);

module.exports = router;
