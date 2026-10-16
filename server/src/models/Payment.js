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
  webhookProcessedAt: {
    type: Date
  },
  webhookEventId: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
