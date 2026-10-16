const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please add a document title'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add a document category']
  },
  description: {
    type: String
  },
  documentType: {
    type: String
  },
  documentDate: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: '1.0'
  },
  url: {
    type: String,
    required: [true, 'Please provide the Cloudinary document URL']
  },
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  visibility: {
    type: String,
    enum: ['AdminOnly', 'ResidentVisible'],
    default: 'AdminOnly'
  },
  status: {
    type: String,
    enum: ['Active', 'Archived', 'Disabled'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
