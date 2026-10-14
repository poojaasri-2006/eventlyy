const express = require('express');
const router = express.Router();

const { getConversations, getMessagesWithUser, sendMessage } = require('../controllers/messages.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/conversations', authMiddleware, getConversations);
router.get('/:contactId', authMiddleware, getMessagesWithUser);
router.post('/:contactId', authMiddleware, sendMessage);

module.exports = router;
