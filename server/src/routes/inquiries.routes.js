const express = require('express');
const router = express.Router();

const { getInquiries, createInquiry, cancelInquiry } = require('../controllers/inquiries.controller');
const { authMiddleware, requireOrganizer } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, requireOrganizer, getInquiries);
router.post('/', authMiddleware, requireOrganizer, createInquiry);
router.patch('/:id/cancel', authMiddleware, requireOrganizer, cancelInquiry);

module.exports = router;
