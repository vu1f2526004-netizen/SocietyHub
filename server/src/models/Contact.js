const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide a valid email address'],
      trim: true,
      lowercase: true,
      maxlength: [120, 'Email cannot exceed 120 characters']
    },
    subject: {
      type: String,
      required: [true, 'Please provide an inquiry subject'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters']
    },
    message: {
      type: String,
      required: [true, 'Please provide a message description'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters']
    },
    status: {
      type: String,
      enum: ['New', 'In Review', 'Resolved', 'Archived'],
      default: 'New',
      index: true
    },
    notificationStatus: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed', 'Skipped'],
      default: 'Pending',
      index: true
    },
    notificationError: {
      type: String,
      default: null
    },
    emailMessageId: {
      type: String,
      default: null
    },
    dedupHash: {
      type: String,
      index: true,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    notifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Contact', ContactSchema);
