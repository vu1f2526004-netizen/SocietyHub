const mongoose = require('mongoose');

const RSVPSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.ObjectId, ref: 'Society', index: true },
  eventId: { type: mongoose.Schema.ObjectId, ref: 'Event', required: true },
  residentId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Going', 'Cancelled'], default: 'Going' },
  attendance: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent duplicate RSVPs
RSVPSchema.index({ eventId: 1, residentId: 1 }, { unique: true });

module.exports = mongoose.model('RSVP', RSVPSchema);
