const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');
const { slotLockRateLimiter } = require('../middleware/rateLimiter');
const { lockSlotRules, releaseLockRules, confirmBookingRules } = require('../middleware/validator');

// 1. Temporarily Lock a Slot (Redis 5-min lock, Rate limited 10 attempts/min)
router.post('/lock', requireAuth, slotLockRateLimiter, lockSlotRules, appointmentController.lockSlot);

// 2. Release a Temporary Slot Lock
router.delete('/lock', requireAuth, releaseLockRules, appointmentController.releaseLock);

// 3. Confirm and Permanently Book an Appointment (SQL Transaction)
router.post('/', requireAuth, confirmBookingRules, appointmentController.confirmBooking);

// 4. Get Current User's Appointments
router.get('/my', requireAuth, appointmentController.getMyAppointments);

// 5. Get Appointment Details by ID
router.get('/:id', requireAuth, appointmentController.getAppointmentById);

// 6. Cancel Appointment
router.patch('/:id/cancel', requireAuth, appointmentController.cancelAppointment);

// 7. Update Appointment Status (Doctor/Admin: COMPLETED, NO_SHOW)
router.patch('/:id/status', requireAuth, appointmentController.updateStatus);

module.exports = router;
