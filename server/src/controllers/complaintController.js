const ErrorResponse = require('../utils/errorResponse');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');
const {
  notifyAdminSeriousComplaint,
  notifyComplaintStatusUpdated,
  notifyStaffTaskAssigned
} = require('../services/notificationService');

exports.createComplaint = async (req, res, next) => {
  try {
    const { category, title, description, location } = req.body;
    let photoUrl = req.file ? req.file.path : undefined;

    const complaint = await Complaint.create({
      societyId: req.user.societyId,
      category,
      title,
      description,
      location,
      photoUrl,
      priority: req.body.priority || 'Medium',
      createdBy: req.user.id,
      statusTimeline: [{ status: 'Pending', updatedBy: req.user.id }]
    });

    await createNotification(req.user.id, 'Complaint Created', `Your complaint "${complaint.title}" has been registered.`, 'Info', '', req.user.societyId);

    // If High priority, alert society Admins
    if (complaint.priority === 'High') {
      notifyAdminSeriousComplaint({ complaintId: complaint._id, societyId: req.user.societyId }).catch(() => {});
    }

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.getMyComplaints = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user.id, societyId: req.user.societyId };

    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { category: searchRegex }
      ];
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

exports.getAllComplaints = async (req, res, next) => {
  try {
    const andConditions = [{ societyId: req.user.societyId }];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.priority && req.query.priority !== 'All') {
      andConditions.push({ priority: req.query.priority });
    }

    if (req.query.category && req.query.category !== 'All') {
      andConditions.push({ category: req.query.category });
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchingUsers = await User.find({
        societyId: req.user.societyId,
        $or: [
          { name: searchRegex },
          { flatNumber: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');

      const matchingUserIds = matchingUsers.map(u => u._id);

      const searchOr = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { category: searchRegex }
      ];

      if (matchingUserIds.length > 0) {
        searchOr.push({ createdBy: { $in: matchingUserIds } });
        searchOr.push({ assignedTo: { $in: matchingUserIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const complaints = await Complaint.find(filter)
      .populate('createdBy', 'name flatNumber email')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

exports.getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('createdBy', 'name flatNumber')
      .populate('assignedTo', 'name');
    
    if (!complaint || (complaint.societyId && complaint.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Role-based privacy checks within the society
    if (req.user.role === 'Resident' && complaint.createdBy._id.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    if (req.user.role === 'SecurityStaff' && (!complaint.assignedTo || complaint.assignedTo._id.toString() !== req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateComplaint = async (req, res, next) => {
  try {
    const { status, priority, assignedTo, adminNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || (complaint.societyId && complaint.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    if (assignedTo) {
      // Ensure assigned staff member belongs to the same society
      const staffUser = await User.findOne({ _id: assignedTo, societyId: req.user.societyId, role: 'SecurityStaff' });
      if (!staffUser) {
        return next(new ErrorResponse('Assigned staff member not found in your society', 400));
      }
      complaint.assignedTo = assignedTo;

      // Notification for task assignment
      notifyStaffTaskAssigned({
        taskType: 'Complaint',
        taskId: complaint._id,
        staffUserId: assignedTo,
        societyId: req.user.societyId
      }).catch(() => {});
    }

    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;
    if (adminNotes) complaint.adminNotes = adminNotes;
    
    if (status && status !== complaint.statusTimeline[complaint.statusTimeline.length - 1].status) {
      complaint.statusTimeline.push({ status, updatedBy: req.user.id, note: adminNotes });
      // In-app notification & transactional email to resident
      notifyComplaintStatusUpdated({
        complaintId: complaint._id,
        societyId: req.user.societyId,
        newStatus: status,
        adminNotes
      }).catch(() => {});
    }

    await complaint.save();
    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.staffUpdateComplaint = async (req, res, next) => {
  try {
    const { status, staffNotes } = req.body;
    let completionPhotoUrl = req.file ? req.file.path : undefined;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || (complaint.societyId && complaint.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    if (complaint.assignedTo?.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to update this task', 403));
    }

    if (['In Progress', 'Completed'].includes(status)) {
        complaint.status = status;
        complaint.statusTimeline.push({ status, updatedBy: req.user.id, note: staffNotes });

        // In-app notification & transactional email to resident
        notifyComplaintStatusUpdated({
          complaintId: complaint._id,
          societyId: req.user.societyId,
          newStatus: status,
          adminNotes: staffNotes
        }).catch(() => {});
    }
    if (staffNotes) complaint.staffNotes = staffNotes;
    if (completionPhotoUrl) complaint.completionPhotoUrl = completionPhotoUrl;

    await complaint.save();
    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.getAssignedTasks = async (req, res, next) => {
  try {
    const filter = { assignedTo: req.user.id, societyId: req.user.societyId };

    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { category: searchRegex }
      ];
    }

    const tasks = await Complaint.find(filter)
      .populate('createdBy', 'name flatNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};
