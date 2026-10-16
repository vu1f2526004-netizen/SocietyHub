const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  image: { type: String },
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Cancelled', 'Completed'],
    default: 'Draft' 
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
