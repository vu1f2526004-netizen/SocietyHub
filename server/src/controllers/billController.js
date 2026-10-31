const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const MaintenanceBill = require('../models/MaintenanceBill');
const User = require('../models/User');
const Flat = require('../models/Flat');
const { createNotification } = require('./notificationController');
const { notifyResidentBillCreated, notifyResidentBillReminder } = require('../services/notificationService');
const { resolveDateRange } = require('../utils/dateRangeHelper');

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
 * Parse billing month string into start and end dates of the calendar month
 */
const getBillingMonthRange = (monthInput) => {
  if (!monthInput) return null;
  const trimmed = monthInput.trim();
  let year, monthNum;
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    year = parseInt(parts[0], 10);
    monthNum = parseInt(parts[1], 10);
  } else {
    const parsed = new Date(Date.parse(`${trimmed} 1`));
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      monthNum = parsed.getMonth() + 1;
    }
  }
  if (!year || !monthNum || isNaN(year) || isNaN(monthNum)) return null;
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
  return { start, end, year, monthNum };
};

/**
 * Canonical normalized flat key for matching across formats (e.g. "A-243" or "243")
 */
const normFlatKey = (str) => (str ? str.toString().trim().toUpperCase().replace(/\s+/g, '') : '');

/**
 * Reconciles Flat records, Resident accounts, and existing monthly bills
 * with strict multi-society isolation, ambiguity detection, and financial onboarding date validation.
 */
const resolveFlatsAndEligibility = async ({ societyId, month, excludedFlatNumbers = [] }) => {
  const normalizedMonth = normalizeMonthString(month);
  const billingMonthRange = getBillingMonthRange(month || normalizedMonth);
  const excludedSet = new Set(excludedFlatNumbers.map(e => normFlatKey(e)));

  const [flats, residents, existingBills] = await Promise.all([
    Flat.find({ societyId }).populate({
      path: 'occupants',
      select: 'name email role status flatNumber financialEffectiveDate createdAt membershipStartDate'
    }),
    User.find({ societyId, role: 'Resident' }).select('name email role status flatNumber financialEffectiveDate createdAt membershipStartDate'),
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

    // Financial Onboarding Rule: Personal maintenance liability starts only from the explicitly established financial effective date
    const effectiveDate = resident.financialEffectiveDate || resident.createdAt;
    if (billingMonthRange && effectiveDate && new Date(effectiveDate) > billingMonthRange.end) {
      excluded.push({
        flatId: flat._id,
        flatNumber: flatDisplay,
        residentId: resident._id,
        residentName: resident.name,
        reason: `Financial onboarding start date (${new Date(effectiveDate).toLocaleDateString()}) is after billing month ${normalizedMonth}`
      });
      continue;
    }

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

    // Financial Onboarding Rule: Personal maintenance liability starts only from the explicitly established financial effective date
    const effectiveDate = resident.financialEffectiveDate || resident.createdAt;
    if (billingMonthRange && effectiveDate && new Date(effectiveDate) > billingMonthRange.end) {
      excluded.push({
        residentId: resident._id,
        residentName: resident.name,
        flatNumber: rawFlatNumber,
        reason: `Financial onboarding start date (${new Date(effectiveDate).toLocaleDateString()}) is after billing month ${normalizedMonth}`
      });
      continue;
    }

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

exports.resolveFlatsAndEligibility = resolveFlatsAndEligibility;

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
    const rawSocietyId = req.user.societyId;
    const residentId = req.user.id;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const andConditions = [
      { 
        residentId, 
        societyId: { $in: [societyObjId, rawSocietyId.toString()] } 
      }
    ];

    if (req.query.status) {
      if (req.query.status === 'unpaid') {
        andConditions.push({ status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } });
      } else if (req.query.status !== 'all' && req.query.status !== 'All') {
        andConditions.push({ status: req.query.status });
      }
    }

    const dateFilter = resolveDateRange(req.query);
    if (!dateFilter.isAllTime) {
      if (dateFilter.billingMonth) {
        andConditions.push({ month: dateFilter.billingMonth });
      } else {
        andConditions.push({
          $or: [
            { dueDate: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
            { createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
          ]
        });
      }
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      andConditions.push({
        $or: [
          { month: searchRegex },
          { description: searchRegex },
          { type: searchRegex },
          { flatNumber: searchRegex }
        ]
      });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const bills = await MaintenanceBill.find(filter).sort({ dueDate: -1, createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      count: bills.length,
      periodLabel: dateFilter.periodLabel,
      data: bills 
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminBills = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const andConditions = [
      { societyId: { $in: [societyObjId, rawSocietyId.toString()] } }
    ];

    if (req.query.status) {
      if (req.query.status === 'unpaid') {
        andConditions.push({ status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } });
      } else if (req.query.status !== 'all' && req.query.status !== 'All') {
        andConditions.push({ status: req.query.status });
      }
    }

    const dateFilter = resolveDateRange(req.query);
    if (!dateFilter.isAllTime) {
      if (dateFilter.billingMonth) {
        andConditions.push({ month: dateFilter.billingMonth });
      } else {
        andConditions.push({
          $or: [
            { dueDate: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
            { createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
          ]
        });
      }
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchingResidents = await User.find({
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { flatNumber: searchRegex },
          { mobile: searchRegex },
          { phone: searchRegex }
        ]
      }).select('_id');

      const matchingResidentIds = matchingResidents.map(r => r._id);

      const searchOr = [
        { flatNumber: searchRegex },
        { month: searchRegex },
        { description: searchRegex },
        { type: searchRegex }
      ];

      if (matchingResidentIds.length > 0) {
        searchOr.push({ residentId: { $in: matchingResidentIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await MaintenanceBill.countDocuments(filter);
    const bills = await MaintenanceBill.find(filter)
      .populate('residentId', 'name email flatNumber')
      .sort({ dueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: bills.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount
      },
      periodLabel: dateFilter.periodLabel,
      data: bills 
    });
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

// In-memory locks to prevent accidental duplicate clicks / retries during bulk sends
const bulkReminderLocks = new Map(); // societyKey -> timestamp

/**
 * Send Individual Bill Reminder
 * POST /api/bills/admin/:id/reminder
 * Enforces immediate status re-check (excludes Paid/Cancelled), multi-society isolation,
 * tracks reminder timestamp and count, without modifying bill status or financial totals.
 */
exports.sendBillReminder = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const billId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return next(new ErrorResponse('Invalid bill ID', 400));
    }

    const bill = await MaintenanceBill.findOne({
      _id: billId,
      societyId: { $in: [rawSocietyId, rawSocietyId.toString()] }
    }).populate('residentId', 'name email flatNumber status');

    if (!bill) {
      return next(new ErrorResponse('Maintenance bill not found or not in your society', 404));
    }

    // 1. Re-check bill's current status immediately before dispatch
    if (bill.status === 'Paid') {
      return next(new ErrorResponse('Cannot send reminder: This maintenance bill is already paid.', 400));
    }
    if (bill.status === 'Cancelled') {
      return next(new ErrorResponse('Cannot send reminder: This maintenance bill is cancelled.', 400));
    }

    if (!bill.residentId) {
      return next(new ErrorResponse('No resident account associated with this bill.', 400));
    }

    // 2. Dispatch reminder (In-app notification + email)
    const delivery = await notifyResidentBillReminder({
      billId: bill._id,
      societyId: rawSocietyId
    });

    // 3. Track reminder timestamp and count on bill without altering financial totals or status
    bill.lastReminderSentAt = new Date();
    bill.reminderCount = (bill.reminderCount || 0) + 1;
    await bill.save();

    res.status(200).json({
      success: true,
      message: `Reminder sent to ${bill.residentId.name} for ${bill.month} bill.`,
      bill: {
        _id: bill._id,
        month: bill.month,
        amount: bill.amount,
        dueDate: bill.dueDate,
        status: bill.status,
        flatNumber: bill.flatNumber,
        lastReminderSentAt: bill.lastReminderSentAt,
        reminderCount: bill.reminderCount
      },
      resident: {
        _id: bill.residentId._id,
        name: bill.residentId.name,
        flatNumber: bill.flatNumber || bill.residentId.flatNumber,
        email: bill.residentId.email
      },
      delivery: {
        inAppNotification: delivery.inAppNotification,
        email: {
          sent: delivery.email?.sent || false,
          acceptedBySmtp: delivery.email?.acceptedBySmtp || false,
          reason: delivery.email?.reason,
          messageId: delivery.email?.messageId,
          error: delivery.email?.error
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send Bulk Bill Reminders
 * POST /api/bills/admin/bulk-reminders
 * Body: { billIds: string[] }
 * Enforces idempotency/in-flight concurrency lock, filters eligible unpaid bills,
 * re-checks status, updates timestamps, and reports separate email and in-app outcomes.
 */
exports.sendBulkBillReminders = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyKey = rawSocietyId ? rawSocietyId.toString() : 'unknown';

    // 1. Prevent duplicate in-flight bulk sends
    const activeLock = bulkReminderLocks.get(societyKey);
    const now = Date.now();
    if (activeLock && (now - activeLock) < 15000) { // 15-second debounce lock
      return next(new ErrorResponse('A bulk reminder dispatch is already in progress for your society. Please wait a moment.', 429));
    }
    bulkReminderLocks.set(societyKey, now);

    const { billIds } = req.body;
    if (!Array.isArray(billIds) || billIds.length === 0) {
      bulkReminderLocks.delete(societyKey);
      return next(new ErrorResponse('Please provide a list of bill IDs for reminder dispatch.', 400));
    }

    // Limit bulk batch size to 100 for safety and rate compliance
    const targetIds = billIds.slice(0, 100).filter(id => mongoose.Types.ObjectId.isValid(id));
    if (targetIds.length === 0) {
      bulkReminderLocks.delete(societyKey);
      return next(new ErrorResponse('No valid bill IDs provided.', 400));
    }

    // 2. Fetch bills belonging strictly to authenticated society
    const bills = await MaintenanceBill.find({
      _id: { $in: targetIds },
      societyId: { $in: [rawSocietyId, rawSocietyId.toString()] }
    }).populate('residentId', 'name email flatNumber status');

    const results = [];
    const skipped = [];
    let processedCount = 0;
    let successfulDeliveries = 0;
    let failedDeliveries = 0;

    for (const bill of bills) {
      // 3. Re-check bill's current status immediately before dispatch
      if (bill.status === 'Paid') {
        skipped.push({
          billId: bill._id,
          flatNumber: bill.flatNumber,
          month: bill.month,
          reason: 'Bill is already paid'
        });
        continue;
      }
      if (bill.status === 'Cancelled') {
        skipped.push({
          billId: bill._id,
          flatNumber: bill.flatNumber,
          month: bill.month,
          reason: 'Bill is cancelled'
        });
        continue;
      }
      if (!bill.residentId) {
        skipped.push({
          billId: bill._id,
          flatNumber: bill.flatNumber,
          month: bill.month,
          reason: 'No resident assigned to bill'
        });
        continue;
      }

      processedCount++;

      try {
        const delivery = await notifyResidentBillReminder({
          billId: bill._id,
          societyId: rawSocietyId
        });

        bill.lastReminderSentAt = new Date();
        bill.reminderCount = (bill.reminderCount || 0) + 1;
        await bill.save();

        const isSuccess = delivery.inAppNotification || delivery.email?.sent;
        if (isSuccess) {
          successfulDeliveries++;
        } else {
          failedDeliveries++;
        }

        results.push({
          billId: bill._id,
          flatNumber: bill.flatNumber || bill.residentId.flatNumber,
          residentName: bill.residentId.name,
          email: bill.residentId.email,
          month: bill.month,
          amount: bill.amount,
          inAppNotification: !!delivery.inAppNotification,
          emailSent: !!delivery.email?.sent,
          acceptedBySmtp: !!delivery.email?.acceptedBySmtp,
          emailReason: delivery.email?.reason || null
        });
      } catch (sendErr) {
        failedDeliveries++;
        results.push({
          billId: bill._id,
          flatNumber: bill.flatNumber || bill.residentId?.flatNumber,
          residentName: bill.residentId?.name,
          status: 'Failed',
          error: sendErr.message
        });
      }
    }

    bulkReminderLocks.delete(societyKey);

    res.status(200).json({
      success: true,
      message: `Processed reminders for ${processedCount} pending bills.`,
      summary: {
        totalRequested: billIds.length,
        totalProcessed: processedCount,
        successfulDeliveries,
        failedDeliveries,
        skippedCount: skipped.length
      },
      results,
      skipped
    });
  } catch (err) {
    bulkReminderLocks.delete(req.user.societyId?.toString());
    next(err);
  }
};

// @desc      Transfer arrears to resident with explicit Admin authorization
// @route     POST /api/bills/admin/transfer-arrears
// @access    Private (Admin only, same society)
exports.transferArrears = async (req, res, next) => {
  try {
    const { 
      targetResidentId, 
      flatNumber, 
      amount, 
      billingMonth, 
      dueDate, 
      reason, 
      transferReference, 
      confirmed 
    } = req.body;

    if (!confirmed) {
      return next(new ErrorResponse('Transferred arrears requires explicit Admin confirmation and audit authorization', 400));
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return next(new ErrorResponse('Please specify a valid transfer amount greater than 0', 400));
    }

    if (!reason || !reason.trim()) {
      return next(new ErrorResponse('A documented audit reason and justification for transferring arrears is required', 400));
    }

    // Verify target resident exists in admin's society
    const targetResident = await User.findOne({
      _id: targetResidentId,
      societyId: req.user.societyId,
      role: 'Resident'
    });

    if (!targetResident) {
      return next(new ErrorResponse('Target resident not found in your society', 404));
    }

    if (targetResident.status !== 'Active') {
      return next(new ErrorResponse(`Cannot transfer arrears to an inactive resident account (Status: ${targetResident.status})`, 400));
    }

    const targetFlat = flatNumber || targetResident.flatNumber;
    const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000);
    const normalizedMonth = billingMonth ? normalizeMonthString(billingMonth) : `Arrears Transfer - ${new Date().toLocaleDateString()}`;
    const approvalRef = transferReference && transferReference.trim() 
      ? transferReference.trim() 
      : `ARR-TRF-${Date.now()}`;

    // Create the explicitly identified, separately recorded Transferred Arrears bill
    const arrearsBill = await MaintenanceBill.create({
      societyId: req.user.societyId,
      residentId: targetResident._id,
      flatNumber: targetFlat,
      amount: numAmount,
      dueDate: parsedDueDate,
      month: normalizedMonth,
      type: 'TransferredArrears',
      description: `Explicit Transferred Arrears: ${reason.trim()} (Ref: ${approvalRef})`,
      status: 'Pending',
      isTransferredArrear: true,
      transferredBy: req.user.id,
      transferredAt: new Date(),
      transferNotes: reason.trim(),
      transferApprovalRef: approvalRef,
      createdBy: req.user.id
    });

    // Update target resident flag for audit tracking
    targetResident.hasTransferredArrears = true;
    targetResident.transferredArrearsNotes = `${reason.trim()} [Amount: ₹${numAmount}, Ref: ${approvalRef}]`;
    await targetResident.save();

    res.status(201).json({
      success: true,
      message: 'Arrears transferred and recorded with separate audit trail successfully',
      data: arrearsBill
    });
  } catch (err) {
    next(err);
  }
};
