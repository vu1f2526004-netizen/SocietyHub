const ErrorResponse = require('../utils/errorResponse');
const MaintenanceBill = require('../models/MaintenanceBill');
const User = require('../models/User');
const Flat = require('../models/Flat');
const { createNotification } = require('./notificationController');
const { notifyResidentBillCreated } = require('../services/notificationService');

/**
 * Normalizes input string to readable Month Year format (e.g. "2026-11" -> "November 2026")
 */
const normalizeMonthString = (monthInput) => {
  if (!monthInput) return '';
  const trimmed = monthInput.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [year, monthNum] = trimmed.split('-');
    const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  return trimmed;
};

/**
 * Canonical normalized flat key for matching across formats (e.g. "A-243" or "243")
 */
const normFlatKey = (str) => (str ? str.toString().trim().toUpperCase().replace(/\s+/g, '') : '');

/**
 * Reconciles Flat records, Resident accounts, and existing monthly bills
 * with strict multi-society isolation and ambiguity detection.
 */
const resolveFlatsAndEligibility = async ({ societyId, month, excludedFlatNumbers = [] }) => {
  const normalizedMonth = normalizeMonthString(month);
  const excludedSet = new Set(excludedFlatNumbers.map(e => normFlatKey(e)));

  const [flats, residents, existingBills] = await Promise.all([
    Flat.find({ societyId }).populate({
      path: 'occupants',
      select: 'name email role status flatNumber'
    }),
    User.find({ societyId, role: 'Resident' }).select('name email role status flatNumber'),
    MaintenanceBill.find({ societyId, month: normalizedMonth, status: { $ne: 'Cancelled' } })
  ]);

  const existingBillByResidentId = new Map();
  const existingBillByFlatNumber = new Map();

  for (const bill of existingBills) {
    if (bill.residentId) {
      existingBillByResidentId.set(bill.residentId.toString(), bill);
    }
    if (bill.flatNumber) {
      existingBillByFlatNumber.set(normFlatKey(bill.flatNumber), bill);
    }
  }

  const eligible = [];
  const skipped = [];
  const excluded = [];

  const processedResidentIds = new Set();
  const processedFlatKeys = new Set();

  // 1. Process Flat collection documents
  for (const flat of flats) {
    const flatDisplay = `${flat.block ? flat.block + '-' : ''}${flat.number}`;
    const flatKey = normFlatKey(flatDisplay);
    const shortFlatKey = normFlatKey(flat.number);
    processedFlatKeys.add(flatKey);
    processedFlatKeys.add(shortFlatKey);

    // Explicit exclusion
    if (excludedSet.has(flatKey) || excludedSet.has(shortFlatKey)) {
      excluded.push({
        flatId: flat._id,
        flatNumber: flatDisplay,
        reason: 'Manually excluded by Admin'
      });
      continue;
    }

    const occupants = flat.occupants || [];
    // Record all occupant IDs so they are not evaluated a second time in Step 2
    for (const occ of occupants) {
      if (occ && occ._id) {
        processedResidentIds.add(occ._id.toString());
      }
    }

    const activeResidents = occupants.filter(o => o && o.role === 'Resident' && o.status === 'Active');

    if (occupants.length === 0 || activeResidents.length === 0) {
      const nonActiveOccupant = occupants.find(o => o && o.role === 'Resident');
      excluded.push({
        flatId: flat._id,
        flatNumber: flatDisplay,
        reason: nonActiveOccupant 
          ? `Resident account is not active (Status: ${nonActiveOccupant.status || 'Inactive'})`
          : 'Vacant flat (No active resident assigned)'
      });
      continue;
    }

    if (activeResidents.length > 1) {
      excluded.push({
        flatId: flat._id,
        flatNumber: flatDisplay,
        occupantCount: activeResidents.length,
        reason: `Ambiguous: Multiple active residents (${activeResidents.length}) registered in flat`
      });
      continue;
    }

    const resident = activeResidents[0];
    processedResidentIds.add(resident._id.toString());

    // Check if bill already exists for this billing period
    const existing = existingBillByResidentId.get(resident._id.toString()) || 
                     existingBillByFlatNumber.get(flatKey) || 
                     existingBillByFlatNumber.get(shortFlatKey);

    if (existing) {
      skipped.push({
        flatId: flat._id,
        flatNumber: flatDisplay,
        residentId: resident._id,
        residentName: resident.name,
        residentEmail: resident.email,
        existingBillId: existing._id,
        existingStatus: existing.status,
        existingAmount: existing.amount,
        reason: `Already billed for ${normalizedMonth} (Status: ${existing.status}, Amount: ₹${existing.amount})`
      });
      continue;
    }

    eligible.push({
      flatId: flat._id,
      flatNumber: resident.flatNumber || flatDisplay,
      canonicalFlat: flatDisplay,
      residentId: resident._id,
      residentName: resident.name,
      residentEmail: resident.email
    });
  }

  // 2. Reconcile active residents without corresponding Flat documents
  for (const resident of residents) {
    if (processedResidentIds.has(resident._id.toString())) {
      continue;
    }

    const rawFlatNumber = resident.flatNumber ? resident.flatNumber.trim() : '';
    const resFlatKey = normFlatKey(rawFlatNumber);

    // If flat was already evaluated in Step 1, skip to prevent double counting
    if (processedFlatKeys.has(resFlatKey)) {
      continue;
    }

    if (!rawFlatNumber) {
      excluded.push({
        residentId: resident._id,
        residentName: resident.name,
        flatNumber: 'N/A',
        reason: 'Resident account missing flat number'
      });
      continue;
    }

    if (resident.status !== 'Active') {
      excluded.push({
        residentId: resident._id,
        residentName: resident.name,
        flatNumber: rawFlatNumber,
        reason: `Resident account is not active (Status: ${resident.status})`
      });
      continue;
    }

    if (excludedSet.has(resFlatKey)) {
      excluded.push({
        residentId: resident._id,
        residentName: resident.name,
        flatNumber: rawFlatNumber,
        reason: 'Manually excluded by Admin'
      });
      continue;
    }

    const othersSharing = residents.filter(r => 
      r.status === 'Active' && 
      r._id.toString() !== resident._id.toString() && 
      normFlatKey(r.flatNumber) === resFlatKey
    );

    if (othersSharing.length > 0) {
      excluded.push({
        residentId: resident._id,
        residentName: resident.name,
        flatNumber: rawFlatNumber,
        reason: 'Ambiguous: Multiple active residents share this flat number without assigned flat'
      });
      continue;
    }

    processedResidentIds.add(resident._id.toString());
    processedFlatKeys.add(resFlatKey);

    const existing = existingBillByResidentId.get(resident._id.toString()) || 
                     existingBillByFlatNumber.get(resFlatKey);

    if (existing) {
      skipped.push({
        flatNumber: rawFlatNumber,
        residentId: resident._id,
        residentName: resident.name,
        residentEmail: resident.email,
        existingBillId: existing._id,
        existingStatus: existing.status,
        existingAmount: existing.amount,
        reason: `Already billed for ${normalizedMonth} (Status: ${existing.status}, Amount: ₹${existing.amount})`
      });
      continue;
    }

    eligible.push({
      flatNumber: rawFlatNumber,
      canonicalFlat: rawFlatNumber,
      residentId: resident._id,
      residentName: resident.name,
      residentEmail: resident.email
    });
  }

  return {
    normalizedMonth,
    eligible,
    skipped,
    excluded
  };
};

// @desc      Preview monthly maintenance bills across all eligible flats
// @route     POST /api/bills/admin/bulk-preview
// @access    Private (Admin only, society scoped)
exports.previewBulkMonthlyBills = async (req, res, next) => {
  try {
    const { month, amount, dueDate, excludedFlatNumbers = [] } = req.body;

    if (!month) {
      return next(new ErrorResponse('Please specify a billing month (e.g. "November 2026" or "2026-11")', 400));
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return next(new ErrorResponse('Please specify a valid maintenance amount greater than 0', 400));
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (!parsedDueDate || isNaN(parsedDueDate.getTime())) {
      return next(new ErrorResponse('Please specify a valid payment due date', 400));
    }

    const { normalizedMonth, eligible, skipped, excluded } = await resolveFlatsAndEligibility({
      societyId: req.user.societyId,
      month,
      excludedFlatNumbers: Array.isArray(excludedFlatNumbers) ? excludedFlatNumbers : []
    });

    const totalAmountToBill = eligible.length * numAmount;

    res.status(200).json({
      success: true,
      data: {
        month: normalizedMonth,
        standardAmount: numAmount,
        dueDate: parsedDueDate.toISOString(),
        totalFlatsFound: eligible.length + skipped.length + excluded.length,
        eligibleCount: eligible.length,
        eligibleResidentCount: eligible.length,
        totalAmountToBill,
        skippedCount: skipped.length,
        excludedCount: excluded.length,
        eligible,
        skipped,
        excluded
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Generate monthly maintenance bills for all eligible flats in one confirmed action
// @route     POST /api/bills/admin/bulk-generate
// @access    Private (Admin only, society scoped)
exports.generateBulkMonthlyBills = async (req, res, next) => {
  try {
    const { month, amount, dueDate, type, description, excludedFlatNumbers = [], confirmed } = req.body;

    if (!confirmed) {
      return next(new ErrorResponse('Bulk bill generation requires explicit confirmation after preview', 400));
    }

    if (!month) {
      return next(new ErrorResponse('Please specify a billing month', 400));
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return next(new ErrorResponse('Please specify a valid maintenance amount greater than 0', 400));
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (!parsedDueDate || isNaN(parsedDueDate.getTime())) {
      return next(new ErrorResponse('Please specify a valid payment due date', 400));
    }

    const societyId = req.user.societyId;
    const { normalizedMonth, eligible, skipped: initialSkipped } = await resolveFlatsAndEligibility({
      societyId,
      month,
      excludedFlatNumbers: Array.isArray(excludedFlatNumbers) ? excludedFlatNumbers : []
    });

    const createdBills = [];
    const skippedBills = [...initialSkipped];
    const failedBills = [];

    for (const item of eligible) {
      const billingPeriodKey = `${societyId}_${normalizedMonth.toLowerCase().trim()}_${normFlatKey(item.flatNumber)}`;

      try {
        // Atomic check right before insert
        const existing = await MaintenanceBill.findOne({
          societyId,
          month: normalizedMonth,
          $or: [
            { flatNumber: item.flatNumber },
            { residentId: item.residentId }
          ],
          status: { $ne: 'Cancelled' }
        });

        if (existing) {
          skippedBills.push({
            flatNumber: item.flatNumber,
            residentId: item.residentId,
            residentName: item.residentName,
            existingBillId: existing._id,
            reason: `Already billed for ${normalizedMonth} (Status: ${existing.status})`
          });
          continue;
        }

        const bill = await MaintenanceBill.create({
          societyId,
          residentId: item.residentId,
          flatNumber: item.flatNumber,
          amount: numAmount,
          dueDate: parsedDueDate,
          month: normalizedMonth,
          type: type || 'Maintenance',
          description: description || `Monthly Maintenance Fee for ${normalizedMonth}`,
          status: 'Pending',
          billingPeriodKey,
          createdBy: req.user.id
        });

        createdBills.push(bill);

        // Dispatch in-app notification & transactional email asynchronously
        notifyResidentBillCreated({ billId: bill._id, societyId }).catch(err => {
          console.error(`[NOTIFICATION] Background notification error for bill ${bill._id}:`, err.message);
        });
      } catch (err) {
        if (err.code === 11000) {
          // Concurrency protection: duplicate bill created simultaneously by concurrent request
          const existing = await MaintenanceBill.findOne({ societyId, billingPeriodKey });
          skippedBills.push({
            flatNumber: item.flatNumber,
            residentId: item.residentId,
            residentName: item.residentName,
            existingBillId: existing?._id,
            reason: `Bill already created concurrently for ${normalizedMonth}`
          });
        } else {
          failedBills.push({
            flatNumber: item.flatNumber,
            residentId: item.residentId,
            residentName: item.residentName,
            error: err.message
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        month: normalizedMonth,
        totalEligible: eligible.length,
        createdCount: createdBills.length,
        skippedCount: skippedBills.length,
        failedCount: failedBills.length,
        totalBilledAmount: createdBills.reduce((acc, b) => acc + b.amount, 0),
        createdBills,
        skippedBills,
        failedBills
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createBill = async (req, res, next) => {
  try {
    const { residentId, amount, dueDate, month, type, description } = req.body;
    
    // Verify resident belongs to the admin's society
    const resident = await User.findOne({ _id: residentId, societyId: req.user.societyId, role: 'Resident' });
    if (!resident) {
      return next(new ErrorResponse('Invalid resident in your society', 400));
    }

    const bill = await MaintenanceBill.create({
      societyId: req.user.societyId,
      residentId,
      flatNumber: resident.flatNumber,
      amount,
      dueDate,
      month,
      type,
      description,
      createdBy: req.user.id
    });

    // In-app notification & transactional email to resident
    notifyResidentBillCreated({ billId: bill._id, societyId: req.user.societyId }).catch(() => {});

    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

exports.getMyBills = async (req, res, next) => {
  try {
    const bills = await MaintenanceBill.find({ residentId: req.user.id, societyId: req.user.societyId }).sort({ dueDate: -1 });
    res.status(200).json({ success: true, data: bills });
  } catch (err) {
    next(err);
  }
};

exports.getAdminBills = async (req, res, next) => {
  try {
    const bills = await MaintenanceBill.find({ societyId: req.user.societyId })
      .populate('residentId', 'name email')
      .sort({ dueDate: -1 });
    res.status(200).json({ success: true, data: bills });
  } catch (err) {
    next(err);
  }
};

exports.getBill = async (req, res, next) => {
  try {
    const bill = await MaintenanceBill.findById(req.params.id);
    if (!bill || (bill.societyId && bill.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    // Role-based access control
    if (req.user.role === 'SecurityStaff') {
      return next(new ErrorResponse('Not authorized to access bill records', 403));
    }
    if (req.user.role === 'Resident' && bill.residentId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

exports.updateBill = async (req, res, next) => {
  try {
    const bill = await MaintenanceBill.findById(req.params.id);
    if (!bill || (bill.societyId && bill.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    // Never mark a bill paid solely from frontend data or reassign across society
    const updateData = { ...req.body };
    delete updateData.societyId;
    delete updateData.residentId;
    if (updateData.status === 'Paid' && bill.status !== 'Paid') {
      delete updateData.status;
    }

    const updatedBill = await MaintenanceBill.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updatedBill });
  } catch (err) {
    next(err);
  }
};

exports.deleteBill = async (req, res, next) => {
  try {
    const bill = await MaintenanceBill.findById(req.params.id);
    if (!bill || (bill.societyId && bill.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    await MaintenanceBill.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
