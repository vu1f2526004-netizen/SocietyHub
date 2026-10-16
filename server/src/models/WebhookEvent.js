const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  event: {
    type: String,
    required: true,
    index: true
  },
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  orderId: {
    type: String,
    index: true
  },
  paymentId: {
    type: String,
    index: true
  },
  billId: {
    type: mongoose.Schema.ObjectId,
    ref: 'MaintenanceBill'
  },
  status: {
    type: String,
    enum: ['Processed', 'Ignored', 'Failed'],
    default: 'Processed'
  },
  reason: {
    type: String
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);
