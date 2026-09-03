/**
 * Centralized Application Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Check for PostgreSQL Unique Constraint Violation (Error Code 23505)
  if (err.code === '23505') {
    let customMsg = 'A duplicate record already exists.';
    if (err.constraint === 'unique_active_doctor_appointment') {
      customMsg = 'This appointment slot is already booked and confirmed for this doctor.';
    } else if (err.constraint === 'users_email_key' || (err.detail && err.detail.includes('email'))) {
      customMsg = 'An account with this email address already exists.';
    }

    return res.status(409).json({
      success: false,
      message: customMsg,
      code: 'DUPLICATE_RESOURCE'
    });
  }

  // Check for PostgreSQL Foreign Key Violation (Error Code 23503)
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist.',
      code: 'FOREIGN_KEY_VIOLATION'
    });
  }

  // Check for custom status errors (e.g. throw { status: 404, message: '...' })
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('SERVER ERROR:', {
      path: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { details: err.details || err.stack })
  });
};

module.exports = errorHandler;
