const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// @desc      Get all users
// @route     GET /api/users
// @access    Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const filter = { societyId: req.user.societyId };
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get all residents
// @route     GET /api/users/residents
// @access    Private/Admin
exports.getResidents = async (req, res, next) => {
  try {
    const filter = {
      societyId: req.user.societyId,
      role: 'Resident'
    };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const residents = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: residents.length,
      data: residents
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get single user (Me)
// @route     GET /api/users/me
// @access    Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};


// @desc      Create user
// @route     POST /api/users
// @access    Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // Only admins can create users, handled by requireRoles middleware in routes
    const { name, email, password, role, flatNumber, mobile, phone } = req.body;
    
    // Ensure role is valid
    if (!['Resident', 'Admin', 'SecurityStaff'].includes(role)) {
       return next(new ErrorResponse('Invalid role', 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      flatNumber,
      mobile,
      phone,
      societyId: req.user.societyId // Strictly associate with admin's society
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      data: userObj
    });
  } catch (err) {
    next(err);
  }
};
