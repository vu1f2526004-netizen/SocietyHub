const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

const router = express.Router();
router.use(verifyToken);

router.get('/', getMyNotifications);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
