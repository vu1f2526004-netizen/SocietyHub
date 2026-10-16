const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  category: {
    type: String,
    required: [true, 'Please add a category']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  relatedComplaintId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Complaint'
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Assigned', 'In Progress', 'Completed', 'Closed'],
    default: 'Assigned'
  },
  adminNotes: {
    type: String
  },
  staffNotes: {
    type: String
  },
  deadline: {
    type: Date
  },
  completionPhotoUrl: {
    type: String
  },
  assignedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
  closedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);
