const ErrorResponse = require('../utils/errorResponse');
const CommunityIssue = require('../models/CommunityIssue');
const User = require('../models/User');

exports.createIssue = async (req, res, next) => {
  try {
    const { issueType, title, description, location, vehicleNumber } = req.body;
    let photoUrl = req.file ? req.file.path : undefined;

    const issue = await CommunityIssue.create({
      societyId: req.user.societyId,
      issueType,
      title,
      description,
      location,
      vehicleNumber,
      photoUrl,
      reporterId: req.user.id
    });

    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

exports.getIssues = async (req, res, next) => {
  try {
    let issues;
    if (req.user.role === 'Admin') {
      // Admin sees everything within their society including reporter details
      issues = await CommunityIssue.find({ societyId: req.user.societyId })
        .populate('reporterId', 'name flatNumber')
        .populate('assignedTo', 'name');
    } else if (req.user.role === 'Resident') {
      // Residents only see approved issues of their society, reporter ID is never exposed
      issues = await CommunityIssue.find({
        societyId: req.user.societyId,
        status: { $in: ['Approved', 'Resolved'] }
      }).select('-reporterId'); 
    } else if (req.user.role === 'SecurityStaff') {
      // Staff only sees assigned issues within their society
      issues = await CommunityIssue.find({
        societyId: req.user.societyId,
        assignedTo: req.user.id
      });
    }

    res.status(200).json({ success: true, data: issues });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateIssue = async (req, res, next) => {
  try {
    const issue = await CommunityIssue.findById(req.params.id);
    if (!issue || (issue.societyId && issue.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Issue not found', 404));
    }

    const { status, adminActionTaken, assignedTo } = req.body;

    if (assignedTo) {
      const staffUser = await User.findOne({ _id: assignedTo, societyId: req.user.societyId, role: 'SecurityStaff' });
      if (!staffUser) {
        return next(new ErrorResponse('Assigned staff member not found in your society', 400));
      }
      issue.assignedTo = assignedTo;
    }

    if (status) issue.status = status;
    if (adminActionTaken) issue.adminActionTaken = adminActionTaken;

    await issue.save();
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

exports.staffUpdateIssue = async (req, res, next) => {
  try {
    const { status, staffNotes } = req.body;
    let staffEvidenceUrl = req.file ? req.file.path : undefined;
    
    const issue = await CommunityIssue.findById(req.params.id);
    if (!issue || (issue.societyId && issue.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Issue not found', 404));
    }

    if (issue.assignedTo?.toString() !== req.user.id) {
       return next(new ErrorResponse('Not authorized', 403));
    }

    if (status) issue.status = status;
    if (staffNotes) issue.staffNotes = staffNotes;
    if (staffEvidenceUrl) issue.staffEvidenceUrl = staffEvidenceUrl;
    
    await issue.save();
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const societyId = req.user.societyId;
    const totalReports = await CommunityIssue.countDocuments({ societyId });
    const byType = await CommunityIssue.aggregate([
      { $match: { societyId } },
      { $group: { _id: "$issueType", count: { $sum: 1 } } }
    ]);
    const byStatus = await CommunityIssue.aggregate([
      { $match: { societyId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalReports,
        byType,
        byStatus
      }
    });
  } catch (err) {
    next(err);
  }
};
