const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please add visitor name'],
    trim: true
  },
  mobile: {
    type: String,
    trim: true,
    default: ''
  },
  expectedDate: {
    type: Date,
    default: Date.now
  },
  expectedTime: {
    type: String,
    default: ''
  },
  purpose: {
    type: String,
    required: [true, 'Please add purpose of visit'],
    trim: true
  },
  vehicleNumber: {
    type: String,
    trim: true,
    default: ''
  },
  residentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  destinationFlat: {
    type: String,
    trim: true,
    index: true
  },
  entryType: {
    type: String,
    enum: ['PreApproved', 'WalkIn'],
    default: 'PreApproved',
    index: true
  },
  visitType: {
    type: String,
    enum: ['Guest', 'Parcel/Delivery', 'Service Provider', 'Other'],
    default: 'Guest'
  },
  requestRef: {
    type: String,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: [
      'Expected',
      'Pending',
      'Approved',
      'Denied',
      'Entered',
      'CheckedIn',
      'Exited',
      'CheckedOut',
      'Cancelled',
      'Expired',
      'ParcelAtGate',
      'ParcelCollected'
    ],
    default: 'Expected',
    index: true
  },
  entryTimestamp: {
    type: Date
  },
  exitTimestamp: {
    type: Date
  },
  gateNotes: {
    type: String,
    default: ''
  },
  handledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  decision: {
    decisionBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    decisionTimestamp: {
      type: Date
    },
    decisionAction: {
      type: String,
      enum: ['Approve', 'Deny', 'ParcelToFlat', 'ParcelAtGate']
    },
    decisionNote: {
      type: String,
      default: ''
    }
  },
  parcelDetails: {
    receivedAt: {
      type: Date
    },
    handedOverAt: {
      type: Date
    },
    handedOverBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, { timestamps: true });

VisitorSchema.index({ societyId: 1, destinationFlat: 1, status: 1 });
VisitorSchema.index({ societyId: 1, entryType: 1, status: 1 });

module.exports = mongoose.model('Visitor', VisitorSchema);
