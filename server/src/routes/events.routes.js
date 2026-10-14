const express = require('express');
const router = express.Router();

const { getEvents, createEvent, getEvent } = require('../controllers/events.controller');
const { getBudget, updateBudget, addBudgetItem, deleteBudgetItem } = require('../controllers/budget.controller');
const { authMiddleware, requireOrganizer } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, requireOrganizer, getEvents);
router.post('/', authMiddleware, requireOrganizer, createEvent);
router.get('/:id', authMiddleware, requireOrganizer, getEvent);

// Budget routes nested under events
router.get('/:eventId/budget', authMiddleware, requireOrganizer, getBudget);
router.post('/:eventId/budget', authMiddleware, requireOrganizer, updateBudget);
router.post('/:eventId/budget/items', authMiddleware, requireOrganizer, addBudgetItem);
router.delete('/:eventId/budget/items/:itemId', authMiddleware, requireOrganizer, deleteBudgetItem);

module.exports = router;
