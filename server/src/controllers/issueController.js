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
    const andConditions = [{ societyId: req.user.societyId }];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.issueType && req.query.issueType !== 'All') {
      andConditions.push({ issueType: req.query.issueType });
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');

      const searchOr = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { vehicleNumber: searchRegex },
        { issueType: searchRegex }
      ];

      if (req.user.role === 'Admin') {
        const matchingUsers = await User.find({
          societyId: req.user.societyId,
          $or: [
            { name: searchRegex },
            { flatNumber: searchRegex }
          ]
        }).select('_id');
        const matchingUserIds = matchingUsers.map(u => u._id);
        if (matchingUserIds.length > 0) {
          searchOr.push({ reporterId: { $in: matchingUserIds } });
        }
      }

      andConditions.push({ $or: searchOr });
    }

    let issues;
    if (req.user.role === 'Admin') {
      const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
      issues = await CommunityIssue.find(filter)
        .populate('reporterId', 'name flatNumber email')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'Resident') {
      andConditions.push({ status: { $in: ['Approved', 'Resolved'] } });
      const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
      issues = await CommunityIssue.find(filter)
        .select('-reporterId')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'SecurityStaff') {
      andConditions.push({ assignedTo: req.user.id });
      const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
      issues = await CommunityIssue.find(filter)
        .sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, count: (issues || []).length, data: issues || [] });
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
