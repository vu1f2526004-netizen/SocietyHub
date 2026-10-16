const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  role: {
    type: String,
    enum: ['Resident', 'Admin', 'SecurityStaff'],
    default: 'Resident'
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  flatNumber: {
    type: String,
    required: function() {
      return this.role === 'Resident';
    }
  },
  mobile: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  societyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    index: true
  },
  status: {
    type: String,
    enum: ['PendingApproval', 'Active', 'Rejected', 'Suspended'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

UserSchema.index({ societyId: 1, role: 1 });

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    if (typeof next === 'function') return next();
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (typeof next === 'function') next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  const payload = { id: this._id, role: this.role };
  if (this.societyId) {
    payload.societyId = this.societyId;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
