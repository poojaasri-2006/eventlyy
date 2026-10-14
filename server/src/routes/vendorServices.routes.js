const express = require('express');
const router = express.Router();

const { getServices, createService, updateService, deleteService } = require('../controllers/vendorServices.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getServices);
router.post('/', authMiddleware, createService);
router.patch('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;
