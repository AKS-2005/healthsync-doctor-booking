const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// All admin routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// Analytics Stats
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getAllUsers);

// Doctor Management
router.get('/doctors', adminController.getAllDoctorsAdmin);
router.patch('/doctors/:id/approve', adminController.toggleDoctorApproval);

module.exports = router;
