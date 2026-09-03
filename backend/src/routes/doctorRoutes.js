const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// List doctors with search, filters, pagination
router.get('/', doctorController.getAllDoctors);

// Get single doctor details
router.get('/:id', doctorController.getDoctorById);

// Get doctor availability for a given date
router.get('/:doctorId/availability', optionalAuth, appointmentController.getAvailability);

// Update doctor profile (DOCTOR or ADMIN)
router.put('/:id', requireAuth, requireRole('DOCTOR', 'ADMIN'), doctorController.updateDoctorProfile);

// Get doctor schedules
router.get('/:id/schedules', doctorController.getDoctorSchedules);

// Set doctor schedules (DOCTOR or ADMIN)
router.post('/:id/schedules', requireAuth, requireRole('DOCTOR', 'ADMIN'), doctorController.setDoctorSchedules);

// Add blocked date (DOCTOR or ADMIN)
router.post('/:id/blocked-dates', requireAuth, requireRole('DOCTOR', 'ADMIN'), doctorController.addBlockedDate);

// Remove blocked date (DOCTOR or ADMIN)
router.delete('/:id/blocked-dates/:date', requireAuth, requireRole('DOCTOR', 'ADMIN'), doctorController.removeBlockedDate);

module.exports = router;
