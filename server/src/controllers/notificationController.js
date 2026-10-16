const ErrorResponse = require('../utils/errorResponse');
const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id, societyId: req.user.societyId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = notifications.filter(n => !n.read).length;
    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, societyId: req.user.societyId },
      { read: true },
      { new: true }
    );
    if (!notification) return next(new ErrorResponse('Not found', 404));
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, societyId: req.user.societyId, read: false }, { read: true });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// Helper function for internal use (not an API route controller)
exports.createNotification = async (userId, title, message, type = 'Info', link = '', societyId = null) => {
  try {
    let targetSocietyId = societyId;
    if (!targetSocietyId) {
      const u = await User.findById(userId).select('societyId');
      targetSocietyId = u ? u.societyId : null;
    }
    await Notification.create({ userId, title, message, type, link, societyId: targetSocietyId });
  } catch (err) {
    console.error('Failed to create notification', err);
  }
};
