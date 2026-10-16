const mongoose = require('mongoose');

const FlatSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  number: {
    type: String,
    required: [true, 'Please add a flat number'],
    trim: true
  },
  block: {
    type: String,
    required: [true, 'Please add a block'],
    trim: true
  },
  occupants: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce uniqueness of flat number per block within each society (allowing same flat number across different societies)
FlatSchema.index({ societyId: 1, block: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Flat', FlatSchema);
