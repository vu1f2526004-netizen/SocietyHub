const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true,
    required: true
  },
  type: {
    type: String,
    enum: ['Income', 'Expense'],
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than zero']
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  vendor: {
    type: String,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Paid',
    index: true
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  referenceId: {
    type: mongoose.Schema.ObjectId, // Could link to Payment or Bill
    index: true
  }
}, { timestamps: true });

FinanceSchema.index({ societyId: 1, type: 1, date: -1 });

module.exports = mongoose.model('Finance', FinanceSchema);
