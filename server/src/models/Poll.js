const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    voteCount: { type: Number, default: 0 }
  }],
  openingDate: { type: Date, required: true },
  closingDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Active', 'Closed', 'Published'],
    default: 'Draft'
  },
  decision: { type: String },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Poll', PollSchema);
