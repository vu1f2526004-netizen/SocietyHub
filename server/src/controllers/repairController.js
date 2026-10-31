const ErrorResponse = require('../utils/errorResponse');
const Repair = require('../models/Repair');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const {
  notifyStaffTaskAssigned,
  notifyAdminEscalatedRepair
} = require('../services/notificationService');

exports.createRepair = async (req, res, next) => {
  try {
    const { title, category, description, location, priority, assignedTo, deadline, adminNotes } = req.body;
    let staffUser = null;

    if (assignedTo) {
      staffUser = await User.findOne({ _id: assignedTo, societyId: req.user.societyId, role: 'SecurityStaff' });
      if (!staffUser) {
        return next(new ErrorResponse('Assigned staff member not found in your society', 400));
      }
    }

    const repair = await Repair.create({
      societyId: req.user.societyId,
      title,
      category,
      description,
      location,
      priority,
      assignedTo,
      deadline,
      adminNotes,
      status: 'Assigned'
    });

    if (assignedTo) {
      notifyStaffTaskAssigned({
        taskType: 'Repair',
        taskId: repair._id,
        staffUserId: assignedTo,
        societyId: req.user.societyId
      }).catch(() => {});
    }

    if (priority === 'High') {
      notifyAdminEscalatedRepair({
        repairId: repair._id,
        societyId: req.user.societyId
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
};

exports.createFromComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint || (complaint.societyId && complaint.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    const { assignedTo, deadline, adminNotes } = req.body;
    let staffUser = null;

    if (assignedTo) {
      staffUser = await User.findOne({ _id: assignedTo, societyId: req.user.societyId, role: 'SecurityStaff' });
      if (!staffUser) {
        return next(new ErrorResponse('Assigned staff member not found in your society', 400));
      }
    }

    const repairTitle = `Repair: ${complaint.title}`;
    const repair = await Repair.create({
      societyId: req.user.societyId,
      title: repairTitle,
      category: complaint.category,
      description: complaint.description,
      location: complaint.location,
      priority: complaint.priority,
      relatedComplaintId: complaint._id,
      assignedTo,
      deadline,
      adminNotes
    });

    if (assignedTo) {
      notifyStaffTaskAssigned({
        taskType: 'Repair',
        taskId: repair._id,
        staffUserId: assignedTo,
        societyId: req.user.societyId
      }).catch(() => {});
    }

    if (complaint.priority === 'High') {
      notifyAdminEscalatedRepair({
        repairId: repair._id,
        societyId: req.user.societyId
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
};

exports.getAdminRepairs = async (req, res, next) => {
  try {
    const andConditions = [{ societyId: req.user.societyId }];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');

      const matchingStaff = await User.find({
        societyId: req.user.societyId,
        $or: [
          { name: searchRegex },
          { mobile: searchRegex }
        ]
      }).select('_id');

      const matchingStaffIds = matchingStaff.map(s => s._id);

      const searchOr = [
        { title: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { location: searchRegex }
      ];

      if (matchingStaffIds.length > 0) {
        searchOr.push({ assignedTo: { $in: matchingStaffIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const repairs = await Repair.find(filter)
      .populate('assignedTo', 'name email mobile')
      .populate('relatedComplaintId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: repairs.length, data: repairs });
  } catch (err) {
    next(err);
  }
};

exports.getStaffRepairs = async (req, res, next) => {
  try {
    const filter = { assignedTo: req.user.id, societyId: req.user.societyId };

    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { location: searchRegex }
      ];
    }

    const repairs = await Repair.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: repairs.length, data: repairs });
  } catch (err) {
    next(err);
  }
};

exports.getRepair = async (req, res, next) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair || (repair.societyId && repair.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Not found', 404));
    }

    if (req.user.role === 'SecurityStaff' && repair.assignedTo?.toString() !== req.user.id) {
       return next(new ErrorResponse('Not authorized', 403));
    }
    res.status(200).json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
};

exports.staffUpdateRepair = async (req, res, next) => {
  try {
    const { status, staffNotes } = req.body;
    let completionPhotoUrl = req.file ? req.file.path : undefined;

    const repair = await Repair.findById(req.params.id);
    if (!repair || (repair.societyId && repair.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Not found', 404));
    }

    if (repair.assignedTo?.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    if (status) repair.status = status;
    if (staffNotes) repair.staffNotes = staffNotes;
    if (completionPhotoUrl) repair.completionPhotoUrl = completionPhotoUrl;

    if (status === 'In Progress') repair.startedAt = Date.now();
    if (status === 'Completed') repair.completedAt = Date.now();

    await repair.save();
    res.status(200).json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
};

exports.adminCloseRepair = async (req, res, next) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair || (repair.societyId && repair.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Not found', 404));
    }

    repair.status = 'Closed';
    repair.closedAt = Date.now();
    await repair.save();

    res.status(200).json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
};
