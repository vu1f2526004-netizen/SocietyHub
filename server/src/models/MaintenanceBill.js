const mongoose = require('mongoose');

const MaintenanceBillSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  residentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  flatNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  month: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    default: 'Maintenance'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'PaymentInitiated', 'Paid', 'Failed', 'Overdue', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  billingPeriodKey: {
    type: String,
    sparse: true,
    index: true
  }
}, { timestamps: true });

// Prevent duplicate monthly maintenance bills for the same flat in the same billing cycle
// Uses partialFilterExpression to safely ignore historical unkeyed records
MaintenanceBillSchema.index(
  { societyId: 1, billingPeriodKey: 1 },
  { unique: true, partialFilterExpression: { billingPeriodKey: { $type: 'string' } } }
);

module.exports = mongoose.model('MaintenanceBill', MaintenanceBillSchema);
