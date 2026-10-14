const express = require('express');
const router = express.Router();

const { getPackages, createPackage, updatePackage, deletePackage } = require('../controllers/vendorPackages.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getPackages);
router.post('/', authMiddleware, createPackage);
router.patch('/:id', authMiddleware, updatePackage);
router.delete('/:id', authMiddleware, deletePackage);

module.exports = router;
