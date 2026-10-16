const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Society = require('../models/Society');
const { notifyAdminNewResidentRegistration } = require('../services/notificationService');

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(normalizedPassword);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check account status
    if (user.status === 'PendingApproval') {
      return next(new ErrorResponse('Your account registration is pending administrator approval', 403));
    }
    if (user.status === 'Rejected') {
      return next(new ErrorResponse('Your registration request was rejected by the society administrator', 403));
    }
    if (user.status === 'Suspended') {
      return next(new ErrorResponse('Your account has been suspended', 403));
    }
    if (user.status !== 'Active') {
      return next(new ErrorResponse('Account is not active', 403));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc      Get current logged in user
// @route     GET /api/auth/me
// @access    Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Log user out / clear cookie
// @route     POST /api/auth/logout
// @access    Private
exports.logout = (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
};

// @desc      Register resident user
// @route     POST /api/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, mobile, flatNumber, password, confirmPassword } = req.body;

    // Validate required fields
    if (!name || !email || !mobile || !flatNumber || !password) {
      return next(new ErrorResponse('Please provide all required fields: name, email, mobile, flatNumber, and password', 400));
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobile.trim();
    const trimmedFlat = flatNumber.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      return next(new ErrorResponse('Please provide your full name', 400));
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }

    // Validate mobile number format (10 to 15 digits)
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      return next(new ErrorResponse('Please provide a valid mobile number (10 to 15 digits)', 400));
    }

    if (!trimmedFlat) {
      return next(new ErrorResponse('Flat number is required', 400));
    }

    // Validate password policy (at least 6 characters)
    if (trimmedPassword.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long', 400));
    }

    // Confirm password match
    if (confirmPassword !== undefined && trimmedPassword !== confirmPassword.trim()) {
      return next(new ErrorResponse('Confirm Password does not match Password', 400));
    }

    // Check for existing account (duplicate email rejection)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new ErrorResponse('An account with this email already exists', 400));
    }

    let targetSocietyId = null;
    let targetSocietyName = '';
    if (req.body.joinCode) {
      const society = await Society.findOne({ joinCode: req.body.joinCode.trim().toUpperCase(), status: 'Active' });
      if (!society) {
        return next(new ErrorResponse('Invalid society join code', 400));
      }
      targetSocietyId = society._id;
      targetSocietyName = society.name;
    } else {
      // Fallback to active legacy society
      const defaultSociety = await Society.findOne({ status: 'Active' }).sort({ createdAt: 1 });
      if (defaultSociety) {
        targetSocietyId = defaultSociety._id;
        targetSocietyName = defaultSociety.name;
      }
    }

    // CRITICAL: Always force role to 'Resident' and status to 'PendingApproval'
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      mobile: trimmedMobile,
      phone: trimmedMobile,
      flatNumber: trimmedFlat,
      password: trimmedPassword,
      role: 'Resident',
      societyId: targetSocietyId,
      status: 'PendingApproval'
    });

    // Notify society Admins about the new registration request
    if (targetSocietyId) {
      notifyAdminNewResidentRegistration({ residentUser: user, societyId: targetSocietyId }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for society administrator approval before logging in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        flatNumber: user.flatNumber,
        mobile: user.mobile,
        societyId: targetSocietyId,
        societyName: targetSocietyName,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Resident joins an existing society using Society Join Code
// @route     POST /api/auth/join-society
// @access    Public
exports.joinSociety = async (req, res, next) => {
  try {
    const { joinCode, name, email, mobile, flatNumber, password, confirmPassword } = req.body;

    if (!joinCode) {
      return next(new ErrorResponse('Please provide a society join code', 400));
    }

    if (!name || !email || !mobile || !flatNumber || !password) {
      return next(new ErrorResponse('Please provide all required fields: name, email, mobile, flatNumber, and password', 400));
    }

    const trimmedCode = String(joinCode).trim().toUpperCase();
    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedMobile = String(mobile).trim();
    const trimmedFlat = String(flatNumber).trim();
    const trimmedPassword = String(password).trim();

    if (!trimmedName) {
      return next(new ErrorResponse('Please provide your full name', 400));
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }

    // Validate mobile number format (10 to 15 digits)
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      return next(new ErrorResponse('Please provide a valid mobile number (10 to 15 digits)', 400));
    }

    if (!trimmedFlat) {
      return next(new ErrorResponse('Flat number is required', 400));
    }

    // Validate password policy (at least 6 characters)
    if (trimmedPassword.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long', 400));
    }

    // Confirm password match
    if (confirmPassword !== undefined && trimmedPassword !== String(confirmPassword).trim()) {
      return next(new ErrorResponse('Confirm Password does not match Password', 400));
    }

    // Check for existing account (duplicate email rejection across entire platform)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new ErrorResponse('An account with this email already exists', 400));
    }

    // Resolve Society by Join Code (Active only)
    const society = await Society.findOne({ joinCode: trimmedCode, status: 'Active' });
    if (!society) {
      return next(new ErrorResponse('Invalid society join code', 400));
    }

    // CRITICAL SECURITY ENFORCEMENTS:
    // 1. Force role to 'Resident' (client-supplied role is discarded)
    // 2. Associate strictly with resolved society._id (client-supplied societyId is discarded)
    // 3. Force status to 'PendingApproval' (client-supplied status is discarded)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      mobile: trimmedMobile,
      phone: trimmedMobile,
      flatNumber: trimmedFlat,
      password: trimmedPassword,
      role: 'Resident',
      societyId: society._id,
      status: 'PendingApproval'
    });

    // Notify society Admins about the new registration request
    notifyAdminNewResidentRegistration({ residentUser: user, societyId: society._id }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for society administrator approval before logging in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        flatNumber: user.flatNumber,
        mobile: user.mobile,
        societyId: society._id,
        societyName: society.name,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get token from model, create response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();
  
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      flatNumber: user.flatNumber,
      mobile: user.mobile || user.phone,
      societyId: user.societyId,
      status: user.status
    }
  });
};

// @desc      Register new society and create initial Admin account
// @route     POST /api/auth/register-society
// @access    Public
exports.registerSociety = async (req, res, next) => {
  try {
    const {
      societyName,
      address,
      city,
      state,
      postalCode,
      name,
      email,
      mobile,
      password,
      confirmPassword
    } = req.body;

    // 1. Validate required fields
    if (!societyName || !address || !city || !state || !postalCode) {
      return next(new ErrorResponse('Please provide all required society fields: societyName, address, city, state, postalCode', 400));
    }

    if (!name || !email || !mobile || !password) {
      return next(new ErrorResponse('Please provide all required secretary fields: name, email, mobile, password', 400));
    }

    const trimmedSocName = String(societyName).trim();
    const trimmedAddress = String(address).trim();
    const trimmedCity = String(city).trim();
    const trimmedState = String(state).trim();
    const trimmedPostalCode = String(postalCode).trim();

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedMobile = String(mobile).trim();
    const trimmedPassword = String(password).trim();

    if (!trimmedSocName || trimmedSocName.length > 100) {
      return next(new ErrorResponse('Society name must be between 1 and 100 characters', 400));
    }

    if (!trimmedName) {
      return next(new ErrorResponse('Please provide secretary full name', 400));
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }

    // Validate mobile number format (10 to 15 digits)
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      return next(new ErrorResponse('Please provide a valid mobile number (10 to 15 digits)', 400));
    }

    // Validate password policy (at least 6 characters)
    if (trimmedPassword.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long', 400));
    }

    // Confirm password match
    if (confirmPassword !== undefined && trimmedPassword !== String(confirmPassword).trim()) {
      return next(new ErrorResponse('Confirm Password does not match Password', 400));
    }

    // 2. Reject if email already belongs to an existing account (global uniqueness)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new ErrorResponse('An account with this email already exists', 400));
    }

    // 3. Prevent duplicate society submission (same name, city and postalCode)
    const existingSociety = await Society.findOne({
      name: { $regex: new RegExp(`^${trimmedSocName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      postalCode: trimmedPostalCode
    });
    if (existingSociety) {
      return next(new ErrorResponse('A society with this name and postal code already exists', 400));
    }

    // 4. Generate unique Join Code
    let joinCode;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      joinCode = Society.generateJoinCode();
      const existing = await Society.findOne({ joinCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    // 5. Atomic / Safe Consistency Strategy
    // Check if configured MongoDB deployment supports multi-document transactions (requires Replica Set or Sharded cluster)
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let createdSociety = null;
    let createdAdmin = null;

    if (supportsTransactions) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const [soc] = await Society.create([{
          name: trimmedSocName,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedState,
          postalCode: trimmedPostalCode,
          joinCode,
          status: 'Active'
        }], { session });
        createdSociety = soc;

        const [admin] = await User.create([{
          name: trimmedName,
          email: normalizedEmail,
          mobile: trimmedMobile,
          phone: trimmedMobile,
          password: trimmedPassword,
          role: 'Admin', // STRICTLY forced to Admin on backend
          societyId: createdSociety._id,
          status: 'Active'
        }], { session });
        createdAdmin = admin;

        createdSociety.createdBy = createdAdmin._id;
        await createdSociety.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return next(err);
      }
    } else {
      // Safe compensating consistency strategy for standalone MongoDB instances
      try {
        createdSociety = await Society.create({
          name: trimmedSocName,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedState,
          postalCode: trimmedPostalCode,
          joinCode,
          status: 'Active'
        });

        createdAdmin = await User.create({
          name: trimmedName,
          email: normalizedEmail,
          mobile: trimmedMobile,
          phone: trimmedMobile,
          password: trimmedPassword,
          role: 'Admin', // STRICTLY forced to Admin on backend
          societyId: createdSociety._id,
          status: 'Active'
        });

        createdSociety.createdBy = createdAdmin._id;
        await createdSociety.save();
      } catch (err) {
        // Compensating rollback: delete orphaned society record if user creation failed
        if (createdSociety && !createdAdmin) {
          try {
            await Society.findByIdAndDelete(createdSociety._id);
          } catch (cleanupErr) {
            console.error('Failed to cleanup orphaned society:', cleanupErr);
          }
        }
        return next(err);
      }
    }

    // 6. Return sanitized response (No password hash, no internal secrets)
    res.status(201).json({
      success: true,
      message: 'Society and Admin account registered successfully. You can now login.',
      society: {
        id: createdSociety._id,
        name: createdSociety.name,
        address: createdSociety.address,
        city: createdSociety.city,
        state: createdSociety.state,
        postalCode: createdSociety.postalCode,
        joinCode: createdSociety.joinCode,
        status: createdSociety.status
      },
      user: {
        id: createdAdmin._id,
        name: createdAdmin.name,
        email: createdAdmin.email,
        role: createdAdmin.role,
        mobile: createdAdmin.mobile,
        societyId: createdAdmin.societyId
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get current admin's society details including Join Code
// @route     GET /api/auth/my-society
// @access    Private/Admin
exports.getMySociety = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return next(new ErrorResponse('Only society administrators can view society management details', 403));
    }

    const society = await Society.findById(req.user.societyId);
    if (!society) {
      return next(new ErrorResponse('Society record not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: society._id,
        name: society.name,
        address: society.address,
        city: society.city,
        state: society.state,
        postalCode: society.postalCode,
        joinCode: society.joinCode,
        status: society.status,
        createdAt: society.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};
