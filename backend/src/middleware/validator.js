const { body, query, param, validationResult } = require('express-validator');

// Middleware to check validation results and return formatted errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the submitted fields.',
      errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg }))
    });
  }
  next();
};

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['PATIENT', 'DOCTOR', 'ADMIN']).withMessage('Role must be PATIENT, DOCTOR, or ADMIN'),
  body('phone').optional().trim(),
  validate
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const lockSlotRules = [
  body('doctorId').isInt({ min: 1 }).withMessage('Valid doctorId is required'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('time').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).withMessage('Time must be in HH:MM format'),
  validate
];

const releaseLockRules = [
  body('doctorId').isInt({ min: 1 }).withMessage('Valid doctorId is required'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('time').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).withMessage('Time must be in HH:MM format'),
  body('lockToken').isUUID().withMessage('Valid lockToken UUID is required'),
  validate
];

const confirmBookingRules = [
  body('doctorId').isInt({ min: 1 }).withMessage('Valid doctorId is required'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('time').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).withMessage('Time must be in HH:MM format'),
  body('lockToken').isUUID().withMessage('Valid lockToken UUID is required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason maximum 500 characters'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes maximum 1000 characters'),
  validate
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  lockSlotRules,
  releaseLockRules,
  confirmBookingRules
};
