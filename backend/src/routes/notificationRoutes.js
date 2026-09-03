const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get my notifications
router.get('/', async (req, res, next) => {
  try {
    const list = await notificationService.getUserNotifications(req.user.userId);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Mark all as read
router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
