const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generate a cryptographically secure, human-readable society join code.
 * Example format: SOC-8K4M9P (omits ambiguous characters: 0, O, 1, I)
 */
const generateJoinCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SOC-${code}`;
};

const SocietySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a society name'],
    trim: true,
    maxlength: [100, 'Society name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Please add street address'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Please add city'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'Please add state'],
    trim: true
  },
  postalCode: {
    type: String,
    required: [true, 'Please add postal code'],
    trim: true
  },
  joinCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'PendingVerification'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Pre-save hook to ensure joinCode is securely generated if absent
SocietySchema.pre('save', function(next) {
  if (!this.joinCode) {
    this.joinCode = generateJoinCode();
  }
  if (typeof next === 'function') next();
});

// Static helper on model for programmatic generation
SocietySchema.statics.generateJoinCode = generateJoinCode;

module.exports = mongoose.model('Society', SocietySchema);
