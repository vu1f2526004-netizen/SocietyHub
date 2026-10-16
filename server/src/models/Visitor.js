const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please add visitor name']
  },
  mobile: {
    type: String,
    required: [true, 'Please add mobile number']
  },
  expectedDate: {
    type: Date,
    required: [true, 'Please add expected date']
  },
  expectedTime: {
    type: String
  },
  purpose: {
    type: String,
    required: [true, 'Please add purpose of visit']
  },
  vehicleNumber: {
    type: String
  },
  residentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Expected', 'Entered', 'Exited', 'Denied', 'Cancelled'],
    default: 'Expected'
  },
  entryTimestamp: {
    type: Date
  },
  exitTimestamp: {
    type: Date
  },
  gateNotes: {
    type: String
  },
  handledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', VisitorSchema);
