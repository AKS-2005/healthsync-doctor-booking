const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules } = require('../middleware/validator');

// Register
router.post('/register', registerRules, authController.register);

// Login with Redis Rate Limiting (5 attempts / minute)
router.post('/login', loginRateLimiter, loginRules, authController.login);

// Get current user profile
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
