const mongoose = require('mongoose');

const CommunityIssueSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  issueType: {
    type: String,
    required: [true, 'Please add an issue type']
  },
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  photoUrl: {
    type: String
  },
  vehicleNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Resolved'],
    default: 'Pending'
  },
  reporterId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  adminActionTaken: {
    type: String
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  staffNotes: {
    type: String
  },
  staffEvidenceUrl: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('CommunityIssue', CommunityIssueSchema);
