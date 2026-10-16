const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  category: {
    type: String,
    required: [true, 'Please add a category']
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
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
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Resolved'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  adminNotes: {
    type: String
  },
  staffNotes: {
    type: String
  },
  completionPhotoUrl: {
    type: String
  },
  statusTimeline: [{
    status: { type: String },
    updatedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    note: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Complaint', ComplaintSchema);
