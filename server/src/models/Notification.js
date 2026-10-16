const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.ObjectId, ref: 'Society', index: true },
  userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'Info' },
  read: { type: Boolean, default: false },
  link: { type: String } // optional link to resource
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
