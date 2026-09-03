const express = require('express');
const router = express.Router();
const specializationController = require('../controllers/specializationController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Public: Get all specializations (Cached in Redis)
router.get('/', specializationController.getAllSpecializations);

// Admin Only
router.post('/', requireAuth, requireRole('ADMIN'), specializationController.createSpecialization);
router.put('/:id', requireAuth, requireRole('ADMIN'), specializationController.updateSpecialization);
router.delete('/:id', requireAuth, requireRole('ADMIN'), specializationController.deleteSpecialization);

module.exports = router;
