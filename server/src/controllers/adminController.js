const mongoose = require('mongoose');
const User = require('../models/User');
const Flat = require('../models/Flat');
const Notification = require('../models/Notification');
const Complaint = require('../models/Complaint');
const Repair = require('../models/Repair');
const MaintenanceBill = require('../models/MaintenanceBill');
const Finance = require('../models/Finance');
const Visitor = require('../models/Visitor');
const CommunityIssue = require('../models/CommunityIssue');
const Payment = require('../models/Payment');
const ErrorResponse = require('../utils/errorResponse');
const { sendEmail } = require('../utils/sendEmail');
const {
  notifyResidentRegistrationApproved,
  notifyResidentRegistrationRejected
} = require('../services/notificationService');

// @desc      Get pending resident registration requests for admin's society
// @route     GET /api/admin/registration-requests
// @access    Private (Admin only)
exports.getRegistrationRequests = async (req, res, next) => {
  try {
    const statusFilter = req.query.status || 'PendingApproval';
    const filter = {
      societyId: req.user.societyId,
      role: 'Resident'
    };

    if (statusFilter !== 'All') {
      filter.status = statusFilter;
    }

    const requests = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Approve resident registration request
// @route     PATCH /api/admin/registration-requests/:id/approve
// @access    Private (Admin only, same society)
exports.approveRegistrationRequest = async (req, res, next) => {
  try {
    const resident = await User.findById(req.params.id);

    if (!resident) {
      return next(new ErrorResponse('Registration request not found', 404));
    }

    // Strict cross-society isolation: admin cannot approve another society's resident
    if (!resident.societyId || resident.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to manage registration requests for another society', 403));
    }

    if (resident.role !== 'Resident') {
      return next(new ErrorResponse('Invalid request: target user is not a resident', 400));
    }

    // Check current status transitions
    if (resident.status === 'Active') {
      return next(new ErrorResponse('Resident account is already approved and active', 400));
    }

    if (resident.status === 'Rejected') {
      return next(new ErrorResponse('Resident registration request was already rejected', 400));
    }

    if (resident.status !== 'PendingApproval') {
      return next(new ErrorResponse('Only pending registration requests can be approved', 400));
    }

    // Update status to Active
    resident.status = 'Active';
    await resident.save();

    // Associate flat record within this society without creating duplicates
    if (resident.flatNumber) {
      let block = 'A';
      let number = resident.flatNumber.trim();
      if (resident.flatNumber.includes('-')) {
        const parts = resident.flatNumber.split('-');
        block = parts[0].trim() || 'A';
        number = parts.slice(1).join('-').trim() || resident.flatNumber.trim();
      }

      let flat = await Flat.findOne({
        societyId: resident.societyId,
        block,
        number
      });

      if (!flat) {
        flat = await Flat.create({
          societyId: resident.societyId,
          block,
          number,
          occupants: [resident._id]
        });
      } else if (!flat.occupants.some(occId => occId.toString() === resident._id.toString())) {
        flat.occupants.push(resident._id);
        await flat.save();
      }
    }

    // In-app notification & transactional email with society branding
    notifyResidentRegistrationApproved({ residentId: resident._id, societyId: resident.societyId }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Resident registration approved successfully',
      data: {
        id: resident._id,
        name: resident.name,
        email: resident.email,
        role: resident.role,
        flatNumber: resident.flatNumber,
        mobile: resident.mobile,
        societyId: resident.societyId,
        status: resident.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Reject resident registration request
// @route     PATCH /api/admin/registration-requests/:id/reject
// @access    Private (Admin only, same society)
exports.rejectRegistrationRequest = async (req, res, next) => {
  try {
    const resident = await User.findById(req.params.id);

    if (!resident) {
      return next(new ErrorResponse('Registration request not found', 404));
    }

    // Strict cross-society isolation: admin cannot reject another society's resident
    if (!resident.societyId || resident.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to manage registration requests for another society', 403));
    }

    if (resident.role !== 'Resident') {
      return next(new ErrorResponse('Invalid request: target user is not a resident', 400));
    }

    // Check current status transitions
    if (resident.status === 'Rejected') {
      return next(new ErrorResponse('Resident registration request is already rejected', 400));
    }

    if (resident.status === 'Active') {
      return next(new ErrorResponse('Active resident account cannot be rejected through registration requests', 400));
    }

    if (resident.status !== 'PendingApproval') {
      return next(new ErrorResponse('Only pending registration requests can be rejected', 400));
    }

    // Update status to Rejected
    resident.status = 'Rejected';
    await resident.save();

    // In-app notification & transactional email
    notifyResidentRegistrationRejected({ residentId: resident._id, societyId: resident.societyId }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Resident registration request rejected',
      data: {
        id: resident._id,
        name: resident.name,
        email: resident.email,
        role: resident.role,
        flatNumber: resident.flatNumber,
        mobile: resident.mobile,
        societyId: resident.societyId,
        status: resident.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get all staff members for admin's society
// @route     GET /api/admin/staff
// @access    Private (Admin only)
exports.getStaffList = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = {
      societyId: req.user.societyId,
      role: 'SecurityStaff'
    };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex }
      ];
    }

    const staff = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get single staff member by ID
// @route     GET /api/admin/staff/:id
// @access    Private (Admin only)
exports.getStaffMember = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id).select('-password');

    if (!staff) {
      return next(new ErrorResponse('Staff member not found', 404));
    }

    // Society boundary check
    if (!staff.societyId || staff.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to view staff from another society', 403));
    }

    if (staff.role !== 'SecurityStaff') {
      return next(new ErrorResponse('Target user is not a staff member', 400));
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Create a new SecurityStaff account
// @route     POST /api/admin/staff
// @access    Private (Admin only)
exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, mobile, phone, password, confirmPassword } = req.body;

    if (!name || !email || !mobile) {
      return next(new ErrorResponse('Please provide full name, email, and mobile number', 400));
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobile.trim();
    const trimmedPhone = phone ? phone.trim() : undefined;

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }

    // Password validation / generation
    let finalPassword = password ? password.trim() : '';
    let isAutoGenerated = false;

    if (!finalPassword) {
      // Secure auto-generated password if admin leaves password blank
      const crypto = require('crypto');
      finalPassword = `SecPass@${crypto.randomBytes(4).toString('hex')}`;
      isAutoGenerated = true;
    } else {
      if (finalPassword.length < 6) {
        return next(new ErrorResponse('Password must be at least 6 characters long', 400));
      }
      if (confirmPassword && confirmPassword.trim() !== finalPassword) {
        return next(new ErrorResponse('Passwords do not match', 400));
      }
    }

    // Check duplicate email across all users
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new ErrorResponse('An account with this email already exists', 400));
    }

    // Derive society strictly from authenticated Admin
    const societyId = req.user.societyId;
    if (!societyId) {
      return next(new ErrorResponse('Admin is not associated with any society', 400));
    }

    // Force role = 'SecurityStaff' and status = 'Active'
    const newStaff = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      mobile: trimmedMobile,
      phone: trimmedPhone,
      password: finalPassword,
      role: 'SecurityStaff',
      societyId: societyId,
      status: 'Active'
    });

    // In-app notification for the newly created staff member
    try {
      await Notification.create({
        societyId: societyId,
        userId: newStaff._id,
        title: 'Account Provisioned',
        message: 'Your Security Staff account has been provisioned by the society administrator.',
        type: 'Success'
      });
    } catch (_) {}

    // Transactional email dispatch if SMTP configured
    let emailStatus = { sent: false, reason: 'SMTP credentials not configured in environment' };
    try {
      const emailResult = await sendEmail({
        to: newStaff.email,
        subject: 'SocietyHub: Security Staff Account Activated',
        text: `Hello ${newStaff.name},\n\nYour Security Staff account has been created for your society.\nYou can now log in at the portal with your email: ${newStaff.email}.\n\nBest regards,\nSociety Administrator`,
        html: `<p>Hello <strong>${newStaff.name}</strong>,</p><p>Your Security Staff account has been created for your society.</p><p>You can now log in at the portal with your email: <strong>${newStaff.email}</strong>.</p>`
      });
      if (emailResult && emailResult.success) {
        emailStatus = { sent: true };
      } else if (emailResult && emailResult.reason) {
        emailStatus = { sent: false, reason: emailResult.reason };
      }
    } catch (err) {
      emailStatus = { sent: false, reason: err.message };
    }

    // Sanitize response - NEVER return password hash
    const responseData = {
      id: newStaff._id,
      name: newStaff.name,
      email: newStaff.email,
      mobile: newStaff.mobile,
      phone: newStaff.phone,
      role: newStaff.role,
      societyId: newStaff.societyId,
      status: newStaff.status,
      createdAt: newStaff.createdAt
    };

    if (isAutoGenerated) {
      responseData.temporarySetupPassword = finalPassword;
    }

    res.status(201).json({
      success: true,
      message: 'Security staff account created successfully',
      data: responseData,
      emailStatus
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Update staff member details
// @route     PATCH /api/admin/staff/:id
// @access    Private (Admin only)
exports.updateStaff = async (req, res, next) => {
  try {
    const { name, mobile, phone } = req.body;
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return next(new ErrorResponse('Staff member not found', 404));
    }

    // Strict cross-society isolation
    if (!staff.societyId || staff.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to update staff belonging to another society', 403));
    }

    if (staff.role !== 'SecurityStaff') {
      return next(new ErrorResponse('Target user is not a staff member', 400));
    }

    if (name && name.trim()) staff.name = name.trim();
    if (mobile && mobile.trim()) staff.mobile = mobile.trim();
    if (phone !== undefined) staff.phone = phone ? phone.trim() : '';

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff details updated successfully',
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        phone: staff.phone,
        role: staff.role,
        societyId: staff.societyId,
        status: staff.status,
        createdAt: staff.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Activate or deactivate (suspend) a staff account
// @route     PATCH /api/admin/staff/:id/status
// @access    Private (Admin only)
exports.updateStaffStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['Active', 'Suspended'].includes(status)) {
      return next(new ErrorResponse('Please provide a valid status: Active or Suspended', 400));
    }

    const staff = await User.findById(req.params.id);

    if (!staff) {
      return next(new ErrorResponse('Staff member not found', 404));
    }

    // Cross-society isolation
    if (!staff.societyId || staff.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to manage staff for another society', 403));
    }

    if (staff.role !== 'SecurityStaff') {
      return next(new ErrorResponse('Target user is not a staff member', 400));
    }

    if (staff.status === status) {
      return next(new ErrorResponse(`Staff account is already ${status}`, 400));
    }

    staff.status = status;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff account successfully ${status === 'Active' ? 'activated' : 'deactivated (suspended)'}`,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: staff.role,
        societyId: staff.societyId,
        status: staff.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get comprehensive dashboard statistics for authenticated admin's society
// @route     GET /api/admin/stats
// @access    Private (Admin only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId)
      ? new mongoose.Types.ObjectId(rawSocietyId)
      : rawSocietyId;
    const socMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    // Today's date boundaries (local day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      residentsCount,
      staffCount,
      pendingComplaintsCount,
      activeRepairsCount,
      pendingBillsAgg,
      monthIncomeAgg,
      monthExpenseAgg,
      visitorsTodayCount,
      pendingIssuesCount,
      recentComplaints,
      recentPayments
    ] = await Promise.all([
      // A. Total Residents (Active residents only)
      User.countDocuments({ societyId: socMatch, role: 'Resident', status: 'Active' }),

      // B. Total Security Staff (Active staff only)
      User.countDocuments({ societyId: socMatch, role: 'SecurityStaff', status: 'Active' }),

      // C. Pending Complaints (Awaiting action)
      Complaint.countDocuments({ societyId: socMatch, status: 'Pending' }),

      // D. Active Repairs (Assigned or In Progress)
      Repair.countDocuments({ societyId: socMatch, status: { $in: ['Assigned', 'In Progress'] } }),

      // E. Pending Maintenance Dues (Sum of all outstanding unpaid bills)
      MaintenanceBill.aggregate([
        { $match: { societyId: socMatch, status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // F. Current Month Income (Verified confirmed ledger receipts)
      Finance.aggregate([
        { $match: { societyId: socMatch, type: 'Income', date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // G. Current Month Expense (Recorded society expenditures)
      Finance.aggregate([
        { $match: { societyId: socMatch, type: 'Expense', date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // H. Today's Visitors (Entered, expected, or created today)
      Visitor.countDocuments({
        societyId: socMatch,
        $or: [
          { entryTimestamp: { $gte: todayStart, $lte: todayEnd } },
          { expectedDate: { $gte: todayStart, $lte: todayEnd } },
          { createdAt: { $gte: todayStart, $lte: todayEnd } }
        ]
      }),

      // I. Pending Issues (Unresolved community issues)
      CommunityIssue.countDocuments({ societyId: socMatch, status: 'Pending' }),

      // Recent Complaints (top 5 latest)
      Complaint.find({ societyId: socMatch })
        .populate('createdBy', 'name flatNumber')
        .sort({ createdAt: -1 })
        .limit(5),

      // Recent Payments (top 5 latest)
      Payment.find({ societyId: socMatch })
        .populate('residentId', 'name flatNumber')
        .populate('billId', 'month amount')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const pendingDues = pendingBillsAgg[0]?.total || 0;
    const monthlyIncome = monthIncomeAgg[0]?.total || 0;
    const monthlyExpense = monthExpenseAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        residents: residentsCount,
        staff: staffCount,
        complaints: pendingComplaintsCount,
        repairs: activeRepairsCount,
        pendingDues,
        income: monthlyIncome,
        expense: monthlyExpense,
        visitorsToday: visitorsTodayCount,
        pendingIssues: pendingIssuesCount,
        recentComplaints,
        recentPayments
      }
    });
  } catch (err) {
    next(err);
  }
};
