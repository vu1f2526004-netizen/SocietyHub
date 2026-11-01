const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  billId: {
    type: mongoose.Schema.ObjectId,
    ref: 'MaintenanceBill',
    required: true,
    index: true
  },
  residentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  payerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    index: true
  },
  payerName: {
    type: String,
    trim: true
  },
  payerEmail: {
    type: String,
    trim: true
  },
  flatNumber: {
    type: String,
    trim: true
  },
  billingMonth: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  additionalCharges: {
    type: Number,
    default: 0
  },
  remainingBalance: {
    type: Number,
    default: 0
  },
  receiptGeneratedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Success', 'Failed'],
    default: 'Pending',
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'Razorpay Online'
  },
  paidAt: {
    type: Date
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  emailReceiptSent: {
    type: Boolean,
    default: false
  },
  // Resident email notification tracking
  residentNotificationStatus: {
    type: String,
    enum: ['Pending', 'Sent', 'Failed', 'Skipped'],
    default: 'Pending',
    index: true
  },
  residentEmailMessageId: {
    type: String,
    default: null
  },
  residentNotifiedAt: {
    type: Date,
    default: null
  },
  residentNotificationError: {
    type: String,
    default: null
  },
  // Secretary / Admin email notification tracking
  adminNotificationStatus: {
    type: String,
    enum: ['Pending', 'Sent', 'Failed', 'Skipped'],
    default: 'Pending',
    index: true
  },
  adminEmailMessageId: {
    type: String,
    default: null
  },
  adminNotifiedAt: {
    type: Date,
    default: null
  },
  adminNotificationError: {
    type: String,
    default: null
  },
  webhookProcessedAt: {
    type: Date
  },
  webhookEventId: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
