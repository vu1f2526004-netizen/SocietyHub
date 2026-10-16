const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.verifyToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
        return next(new ErrorResponse('User not found with this token', 401));
    }

    // Verify account status
    if (req.user.status === 'PendingApproval') {
      return next(new ErrorResponse('Your account is pending administrator approval', 403));
    }
    if (req.user.status === 'Rejected') {
      return next(new ErrorResponse('Your registration request was rejected by the society administrator', 403));
    }
    if (req.user.status === 'Suspended') {
      return next(new ErrorResponse('Your account has been suspended', 403));
    }
    if (req.user.status !== 'Active') {
      return next(new ErrorResponse('Account is not active', 403));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
exports.requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Ownership helper with society scope enforcement
exports.isOwner = (resourceUserId, reqUser, resourceSocietyId = null) => {
  if (resourceSocietyId && reqUser.societyId && resourceSocietyId.toString() !== reqUser.societyId.toString()) {
    return false;
  }
  if (reqUser.role === 'Admin') return true; // Admins can manage records within their own society
  return resourceUserId.toString() === reqUser._id.toString();
};

// Middleware to ensure user is bound to an authorized society
exports.requireSociety = (req, res, next) => {
  if (!req.user || !req.user.societyId) {
    return next(new ErrorResponse('User is not associated with any society', 403));
  }
  next();
};
