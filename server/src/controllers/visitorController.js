const ErrorResponse = require('../utils/errorResponse');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');

exports.createVisitor = async (req, res, next) => {
  try {
    const { name, mobile, expectedDate, expectedTime, purpose, vehicleNumber } = req.body;
    
    const visitor = await Visitor.create({
      societyId: req.user.societyId,
      name,
      mobile,
      expectedDate,
      expectedTime,
      purpose,
      vehicleNumber,
      residentId: req.user.id,
      status: 'Expected'
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

exports.getMyVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find({ residentId: req.user.id, societyId: req.user.societyId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: visitors });
  } catch (err) {
    next(err);
  }
};

exports.getAllVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find({ societyId: req.user.societyId })
      .populate('residentId', 'name flatNumber')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: visitors });
  } catch (err) {
    next(err);
  }
};

exports.getGateVisitors = async (req, res, next) => {
  try {
    // SecurityStaff operational data for gate operations within their society
    const visitors = await Visitor.find({ societyId: req.user.societyId })
      .populate('residentId', 'name flatNumber')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: visitors });
  } catch (err) {
    next(err);
  }
};

exports.updateVisitorStatus = async (req, res, next) => {
  try {
    const { status, gateNotes } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor || (visitor.societyId && visitor.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Visitor not found', 404));
    }

    // Resident can only cancel Expected visitor
    if (req.user.role === 'Resident') {
      if (visitor.residentId.toString() !== req.user.id) return next(new ErrorResponse('Not authorized', 403));
      if (status === 'Cancelled' && visitor.status === 'Expected') {
        visitor.status = 'Cancelled';
        await visitor.save();
        return res.status(200).json({ success: true, data: visitor });
      } else {
        return next(new ErrorResponse('Cannot change status', 400));
      }
    }

    // SecurityStaff Updates
    if (req.user.role === 'SecurityStaff') {
      visitor.status = status;
      visitor.gateNotes = gateNotes || visitor.gateNotes;
      visitor.handledBy = req.user.id;
      
      if (status === 'Entered') {
        visitor.entryTimestamp = Date.now();
        // In-app and email notifications for visitor arrival
        User.findById(visitor.residentId).then(residentUser => {
          if (residentUser) {
            createNotification(
              visitor.residentId,
              'Visitor Arrived',
              `Your visitor "${visitor.name}" has checked in at the gate.`,
              'Info',
              '',
              visitor.societyId
            );
            if (residentUser.email) {
              sendEmail({
                to: residentUser.email,
                subject: `SocietyHub: Visitor Arrival - ${visitor.name}`,
                text: `Hello ${residentUser.name},\n\nYour visitor "${visitor.name}" has arrived and checked in at the security gate.\nPurpose: ${visitor.purpose || 'Visit'}\n\nSecurity Gate Operations`,
                html: `<p>Hello <strong>${residentUser.name}</strong>,</p><p>Your visitor <strong>${visitor.name}</strong> has arrived and checked in at the security gate.</p><p>Purpose: ${visitor.purpose || 'Visit'}</p>`
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }
      if (status === 'Exited') visitor.exitTimestamp = Date.now();

      await visitor.save();
      return res.status(200).json({ success: true, data: visitor });
    }

    return next(new ErrorResponse('Not authorized', 403));
  } catch (err) {
    next(err);
  }
};
