const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');

// Chat endpoint (supports both guest users and authenticated patients/doctors)
router.post('/chat', optionalAuth, aiController.chat);

// Quick suggestions endpoint (personalized based on auth status)
router.get('/suggestions', optionalAuth, aiController.getSuggestions);

module.exports = router;
