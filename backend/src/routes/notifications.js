const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// @route GET /api/v1/notifications
router.get('/', notificationController.getMyNotifications);

// @route PATCH /api/v1/notifications/read-all
router.patch('/read-all', notificationController.markAllAsRead);

// @route PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);

// @route DELETE /api/v1/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
