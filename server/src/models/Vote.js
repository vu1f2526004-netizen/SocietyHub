const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.ObjectId, ref: 'Society', index: true },
  pollId: { type: mongoose.Schema.ObjectId, ref: 'Poll', required: true },
  residentId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  optionId: { type: mongoose.Schema.ObjectId, required: true }
}, { timestamps: true });

// Prevent duplicate voting
VoteSchema.index({ pollId: 1, residentId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
