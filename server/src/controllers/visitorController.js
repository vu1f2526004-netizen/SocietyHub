const ErrorResponse = require('../utils/errorResponse');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');

// Helper to auto-expire past-due pending requests
const expirePendingRequests = async (societyId) => {
  try {
    const now = new Date();
    await Visitor.updateMany(
      {
        societyId,
        status: 'Pending',
        expiresAt: { $lte: now }
      },
      {
        $set: { status: 'Expired' }
      }
    );
  } catch (err) {
    console.error('Failed to auto-expire pending visitor requests', err);
  }
};

/**
 * @desc Get available destination flats in authenticated society
 * @route GET /api/visitors/flats
 * @access SecurityStaff, Admin
 */
exports.getDestinationFlats = async (req, res, next) => {
  try {
    const residents = await User.find({
      societyId: req.user.societyId,
      role: 'Resident',
      status: 'Active',
      flatNumber: { $exists: true, $ne: '' }
    }).select('flatNumber name');

    // Aggregate unique flats without exposing sensitive contact details
    const flatMap = new Map();
    residents.forEach(r => {
      const flat = r.flatNumber.trim();
      if (!flatMap.has(flat)) {
        flatMap.set(flat, { flatNumber: flat, residentNames: [r.name], residentCount: 1 });
      } else {
        const item = flatMap.get(flat);
        item.residentNames.push(r.name);
        item.residentCount += 1;
      }
    });

    const flats = Array.from(flatMap.values()).sort((a, b) => 
      a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true, sensitivity: 'base' })
    );

    res.status(200).json({ success: true, count: flats.length, data: flats });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Create a Walk-in Visitor permission request
 * @route POST /api/visitors/walk-in
 * @access SecurityStaff
 */
exports.createWalkInRequest = async (req, res, next) => {
  try {
    const { name, mobile, destinationFlat, visitType, purpose, vehicleNumber } = req.body;

    if (!name || !name.trim()) {
      return next(new ErrorResponse('Please provide visitor name', 400));
    }
    if (!destinationFlat || !destinationFlat.trim()) {
      return next(new ErrorResponse('Please specify destination flat number', 400));
    }
    if (!purpose || !purpose.trim()) {
      return next(new ErrorResponse('Please specify purpose of visit', 400));
    }

    const trimmedFlat = destinationFlat.trim();

    // Verify destination flat belongs to authenticated society and has active resident(s)
    const activeResidents = await User.find({
      societyId: req.user.societyId,
      role: 'Resident',
      status: 'Active',
      flatNumber: trimmedFlat
    });

    if (!activeResidents || activeResidents.length === 0) {
      return next(new ErrorResponse(`Destination flat "${trimmedFlat}" has no active resident in this society`, 400));
    }

    const primaryResident = activeResidents[0];
    const allowedVisitTypes = ['Guest', 'Parcel/Delivery', 'Service Provider', 'Other'];
    const validVisitType = allowedVisitTypes.includes(visitType) ? visitType : 'Guest';

    // Unique reference and 30-minute expiry window
    const requestRef = `WALK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const visitor = await Visitor.create({
      societyId: req.user.societyId,
      name: name.trim(),
      mobile: mobile ? mobile.trim() : '',
      destinationFlat: trimmedFlat,
      entryType: 'WalkIn',
      visitType: validVisitType,
      purpose: purpose.trim(),
      vehicleNumber: vehicleNumber ? vehicleNumber.trim() : '',
      residentId: primaryResident._id,
      status: 'Pending',
      requestRef,
      handledBy: req.user.id,
      expectedDate: new Date(),
      expiresAt
    });

    // Notify all active residents for destination flat
    for (const resident of activeResidents) {
      createNotification(
        resident._id,
        'Visitor Entry Request',
        `${name.trim()} (${validVisitType}) requested entry to Flat ${trimmedFlat} (Ref: ${requestRef}).`,
        'Alert',
        '/resident/visitors',
        req.user.societyId
      );

      if (resident.email) {
        sendEmail({
          to: resident.email,
          subject: `SocietyHub: Gate Permission Request - ${name.trim()}`,
          text: `Hello ${resident.name},\n\nA visitor (${name.trim()}, ${validVisitType}) is at the gate requesting entry to Flat ${trimmedFlat}.\nPurpose: ${purpose.trim()}\nReference: ${requestRef}\n\nPlease approve or deny this request in your Resident portal.\n\nGate Security`,
          html: `<p>Hello <strong>${resident.name}</strong>,</p><p>A visitor (<strong>${name.trim()}</strong>, ${validVisitType}) is at the gate requesting entry to Flat <strong>${trimmedFlat}</strong>.</p><p>Purpose: ${purpose.trim()}<br>Reference: <code>${requestRef}</code></p><p>Please approve or deny this request in your Resident portal.</p>`
        }).catch(() => {});
      }
    }

    res.status(201).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get Gate Permission Requests for authenticated resident's flat
 * @route GET /api/visitors/permissions/my
 * @access Resident
 */
exports.getResidentPermissionRequests = async (req, res, next) => {
  try {
    await expirePendingRequests(req.user.societyId);

    const filter = {
      societyId: req.user.societyId,
      destinationFlat: req.user.flatNumber,
      entryType: 'WalkIn'
    };

    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { purpose: searchRegex },
        { requestRef: searchRegex },
        { vehicleNumber: searchRegex },
        { visitType: searchRegex }
      ];
    }

    const requests = await Visitor.find(filter)
      .populate('handledBy', 'name')
      .populate('decision.decisionBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Decide on a walk-in permission request (Approve, Deny, ParcelToFlat, ParcelAtGate)
 * @route PATCH /api/visitors/:id/permission
 * @access Resident
 */
exports.decideResidentPermission = async (req, res, next) => {
  try {
    const { action, note } = req.body;
    const allowedActions = ['Approve', 'Deny', 'ParcelToFlat', 'ParcelAtGate'];

    if (!action || !allowedActions.includes(action)) {
      return next(new ErrorResponse('Invalid permission action. Must be Approve, Deny, ParcelToFlat, or ParcelAtGate', 400));
    }

    const now = new Date();
    let nextStatus = 'Approved';
    if (action === 'Deny') nextStatus = 'Denied';
    if (action === 'ParcelAtGate') nextStatus = 'ParcelAtGate';

    const updateFields = {
      status: nextStatus,
      decision: {
        decisionBy: req.user.id,
        decisionTimestamp: now,
        decisionAction: action,
        decisionNote: (note || '').trim()
      }
    };

    if (action === 'ParcelAtGate') {
      updateFields.parcelDetails = {
        receivedAt: now,
        notes: (note || 'Parcel left at security desk').trim()
      };
    }

    // Atomic conditional update ensuring only one decision on a pending, non-expired request for this flat & society
    const visitor = await Visitor.findOneAndUpdate(
      {
        _id: req.params.id,
        societyId: req.user.societyId,
        destinationFlat: req.user.flatNumber,
        status: 'Pending',
        expiresAt: { $gt: now }
      },
      { $set: updateFields },
      { new: true }
    ).populate('handledBy', 'name').populate('residentId', 'name flatNumber email');

    if (!visitor) {
      // Diagnostic check for precise audit feedback
      const existing = await Visitor.findById(req.params.id);
      if (!existing || existing.societyId.toString() !== req.user.societyId.toString() || existing.destinationFlat !== req.user.flatNumber) {
        return next(new ErrorResponse('Permission request not found or not authorized for your flat', 404));
      }
      if (existing.expiresAt && existing.expiresAt <= now && existing.status === 'Pending') {
        existing.status = 'Expired';
        await existing.save();
        return next(new ErrorResponse('This permission request has expired', 400));
      }
      return next(new ErrorResponse(`Permission request has already been resolved (${existing.status})`, 400));
    }

    // Notify staff member who initiated the request
    if (visitor.handledBy) {
      createNotification(
        visitor.handledBy._id || visitor.handledBy,
        `Resident Decision: ${nextStatus}`,
        `Resident of Flat ${visitor.destinationFlat} decided "${action}" for visitor ${visitor.name}.`,
        'Info',
        '/staff/visitors',
        req.user.societyId
      );
    }

    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Record parcel handover to resident
 * @route PATCH /api/visitors/:id/parcel-handover
 * @access SecurityStaff
 */
exports.recordParcelHandover = async (req, res, next) => {
  try {
    const now = new Date();
    const visitor = await Visitor.findOneAndUpdate(
      {
        _id: req.params.id,
        societyId: req.user.societyId,
        status: 'ParcelAtGate'
      },
      {
        $set: {
          status: 'ParcelCollected',
          'parcelDetails.handedOverAt': now,
          'parcelDetails.handedOverBy': req.user.id
        }
      },
      { new: true }
    ).populate('residentId', 'name flatNumber email');

    if (!visitor) {
      const existing = await Visitor.findById(req.params.id);
      if (!existing || existing.societyId.toString() !== req.user.societyId.toString()) {
        return next(new ErrorResponse('Parcel record not found', 404));
      }
      return next(new ErrorResponse(`Cannot record handover for parcel with status "${existing.status}"`, 400));
    }

    // Notify resident of pickup confirmation
    createNotification(
      visitor.residentId._id,
      'Parcel Collected',
      `Your parcel from ${visitor.name} has been handed over at the security desk.`,
      'Info',
      '/resident/visitors',
      req.user.societyId
    );

    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Create pre-approved visitor request
 * @route POST /api/visitors
 * @access Resident
 */
exports.createVisitor = async (req, res, next) => {
  try {
    const { name, mobile, expectedDate, expectedTime, purpose, vehicleNumber } = req.body;
    
    const visitor = await Visitor.create({
      societyId: req.user.societyId,
      name: (name || '').trim(),
      mobile: (mobile || '').trim(),
      expectedDate: expectedDate || new Date(),
      expectedTime: expectedTime || '',
      purpose: (purpose || '').trim(),
      vehicleNumber: (vehicleNumber || '').trim(),
      residentId: req.user.id,
      destinationFlat: req.user.flatNumber,
      entryType: 'PreApproved',
      status: 'Expected'
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all visitors associated with authenticated resident
 * @route GET /api/visitors/my
 * @access Resident
 */
exports.getMyVisitors = async (req, res, next) => {
  try {
    await expirePendingRequests(req.user.societyId);

    const filter = {
      societyId: req.user.societyId,
      $or: [
        { residentId: req.user.id },
        { destinationFlat: req.user.flatNumber }
      ]
    };

    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$and = [
        {
          $or: [
            { name: searchRegex },
            { mobile: searchRegex },
            { vehicleNumber: searchRegex },
            { purpose: searchRegex },
            { requestRef: searchRegex }
          ]
        }
      ];
    }

    const visitors = await Visitor.find(filter)
      .populate('handledBy', 'name')
      .populate('decision.decisionBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all visitors across society (Admin only)
 * @route GET /api/visitors/admin
 * @access Admin
 */
exports.getAllVisitors = async (req, res, next) => {
  try {
    await expirePendingRequests(req.user.societyId);

    const andConditions = [{ societyId: req.user.societyId }];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchingResidents = await User.find({
        societyId: req.user.societyId,
        $or: [
          { name: searchRegex },
          { flatNumber: searchRegex },
          { mobile: searchRegex }
        ]
      }).select('_id');

      const matchingResidentIds = matchingResidents.map(r => r._id);

      const searchOr = [
        { name: searchRegex },
        { mobile: searchRegex },
        { vehicleNumber: searchRegex },
        { purpose: searchRegex },
        { destinationFlat: searchRegex },
        { requestRef: searchRegex }
      ];

      if (matchingResidentIds.length > 0) {
        searchOr.push({ residentId: { $in: matchingResidentIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const visitors = await Visitor.find(filter)
      .populate('residentId', 'name flatNumber')
      .populate('handledBy', 'name')
      .populate('decision.decisionBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get Gate Visitors for operations (SecurityStaff)
 * @route GET /api/visitors/staff
 * @access SecurityStaff
 */
exports.getGateVisitors = async (req, res, next) => {
  try {
    await expirePendingRequests(req.user.societyId);

    const andConditions = [{ societyId: req.user.societyId }];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const matchingResidents = await User.find({
        societyId: req.user.societyId,
        $or: [
          { name: searchRegex },
          { flatNumber: searchRegex },
          { mobile: searchRegex }
        ]
      }).select('_id');

      const matchingResidentIds = matchingResidents.map(r => r._id);

      const searchOr = [
        { name: searchRegex },
        { mobile: searchRegex },
        { vehicleNumber: searchRegex },
        { purpose: searchRegex },
        { destinationFlat: searchRegex },
        { requestRef: searchRegex }
      ];

      if (matchingResidentIds.length > 0) {
        searchOr.push({ residentId: { $in: matchingResidentIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const visitors = await Visitor.find(filter)
      .populate('residentId', 'name flatNumber')
      .populate('handledBy', 'name')
      .populate('decision.decisionBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update visitor status (Check-in, Check-out, Cancel)
 * @route PATCH /api/visitors/:id/status
 * @access Resident, SecurityStaff
 */
exports.updateVisitorStatus = async (req, res, next) => {
  try {
    const { status, gateNotes } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor || (visitor.societyId && visitor.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Visitor not found', 404));
    }

    // Resident authorization: can only cancel their own Expected or Pending visitor
    if (req.user.role === 'Resident') {
      const isOwner = visitor.residentId.toString() === req.user.id || visitor.destinationFlat === req.user.flatNumber;
      if (!isOwner) return next(new ErrorResponse('Not authorized', 403));
      
      if (status === 'Cancelled' && (visitor.status === 'Expected' || visitor.status === 'Pending')) {
        visitor.status = 'Cancelled';
        await visitor.save();
        return res.status(200).json({ success: true, data: visitor });
      } else {
        return next(new ErrorResponse('Cannot change status to ' + status, 400));
      }
    }

    // SecurityStaff Updates & Enforcement
    if (req.user.role === 'SecurityStaff') {
      // 1. Check-In Operation ('Entered' or 'CheckedIn')
      if (status === 'Entered' || status === 'CheckedIn') {
        // BACKEND ENFORCEMENT: A walk-in visitor must NOT be checked in while Pending, Denied, Expired, Cancelled, or ParcelAtGate
        if (visitor.entryType === 'WalkIn') {
          if (visitor.status !== 'Approved') {
            return next(new ErrorResponse(
              `Cannot check in walk-in visitor with status '${visitor.status}'. Resident approval is required.`,
              400
            ));
          }
        } else {
          // PreApproved expected visitor must be Expected
          if (visitor.status !== 'Expected') {
            return next(new ErrorResponse(
              `Cannot check in pre-approved visitor with status '${visitor.status}'.`,
              400
            ));
          }
        }

        const allowedCurrentStatus = visitor.entryType === 'WalkIn' ? 'Approved' : 'Expected';
        const checkedIn = await Visitor.findOneAndUpdate(
          {
            _id: visitor._id,
            societyId: req.user.societyId,
            status: allowedCurrentStatus
          },
          {
            $set: {
              status: 'Entered',
              entryTimestamp: new Date(),
              gateNotes: gateNotes || visitor.gateNotes,
              handledBy: req.user.id
            }
          },
          { new: true }
        ).populate('residentId', 'name flatNumber email');

        if (!checkedIn) {
          return next(new ErrorResponse('Failed to check in visitor. State may have already changed.', 400));
        }

        // Notify Resident on entry
        User.findById(checkedIn.residentId).then(residentUser => {
          if (residentUser) {
            createNotification(
              residentUser._id,
              'Visitor Arrived & Admitted',
              `${checkedIn.name} has entered through the security gate for Flat ${checkedIn.destinationFlat || residentUser.flatNumber}.`,
              'Info',
              '/resident/visitors',
              checkedIn.societyId
            );
            if (residentUser.email) {
              sendEmail({
                to: residentUser.email,
                subject: `SocietyHub: Visitor Check-In - ${checkedIn.name}`,
                text: `Hello ${residentUser.name},\n\nYour visitor "${checkedIn.name}" has checked in at the gate.\nPurpose: ${checkedIn.purpose || 'Visit'}\n\nSecurity Gate Operations`,
                html: `<p>Hello <strong>${residentUser.name}</strong>,</p><p>Your visitor <strong>${checkedIn.name}</strong> has checked in at the gate.</p><p>Purpose: ${checkedIn.purpose || 'Visit'}</p>`
              }).catch(() => {});
            }
          }
        }).catch(() => {});

        return res.status(200).json({ success: true, data: checkedIn });
      }

      // 2. Check-Out Operation ('Exited' or 'CheckedOut')
      if (status === 'Exited' || status === 'CheckedOut') {
        if (visitor.status !== 'Entered' && visitor.status !== 'CheckedIn') {
          return next(new ErrorResponse(`Cannot check out visitor who is not currently inside (status: ${visitor.status})`, 400));
        }

        const checkedOut = await Visitor.findOneAndUpdate(
          {
            _id: visitor._id,
            societyId: req.user.societyId,
            status: { $in: ['Entered', 'CheckedIn'] }
          },
          {
            $set: {
              status: 'Exited',
              exitTimestamp: new Date(),
              gateNotes: gateNotes || visitor.gateNotes,
              handledBy: req.user.id
            }
          },
          { new: true }
        );

        return res.status(200).json({ success: true, data: checkedOut });
      }

      // 3. Deny Operation by Gate Staff
      if (status === 'Denied') {
        if (visitor.status === 'Entered' || visitor.status === 'Exited') {
          return next(new ErrorResponse(`Cannot deny a visitor who has already entered`, 400));
        }
        visitor.status = 'Denied';
        visitor.gateNotes = gateNotes || visitor.gateNotes;
        visitor.handledBy = req.user.id;
        await visitor.save();
        return res.status(200).json({ success: true, data: visitor });
      }

      return next(new ErrorResponse(`Unsupported status update: ${status}`, 400));
    }

    return next(new ErrorResponse('Not authorized', 403));
  } catch (err) {
    next(err);
  }
};
