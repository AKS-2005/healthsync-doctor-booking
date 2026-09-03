const express = require('express');
const router = express.Router();
const concurrencyDemoController = require('../controllers/concurrencyDemoController');

// Simulate Race Condition (Public / Demonstration endpoint)
router.post('/simulate-race-condition', concurrencyDemoController.simulateRaceCondition);

module.exports = router;
