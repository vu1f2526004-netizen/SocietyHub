const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const ErrorResponse = require('../utils/errorResponse');
const Payment = require('../models/Payment');
const MaintenanceBill = require('../models/MaintenanceBill');
const Finance = require('../models/Finance');
const User = require('../models/User');
const WebhookEvent = require('../models/WebhookEvent');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');
const { notifyPaymentConfirmed, notifyPaymentFailed } = require('../services/notificationService');
const { verifyWebhookSignature, extractEventId } = require('../utils/razorpayWebhook');
const { resolveDateRange } = require('../utils/dateRangeHelper');

const getRazorpayKeyId = () => {
  return (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '').trim();
};

const getRazorpayKeySecret = () => {
  return (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '').trim();
};

const getRazorpayWebhookSecret = () => {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
};

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret()
  });
};

exports.createOrder = async (req, res, next) => {
  try {
    const { billId } = req.body;
    const bill = await MaintenanceBill.findById(billId);

    if (!bill || (bill.societyId && bill.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    // Authorization: User is the bill owner, or an authorized co-occupant of the same flat in the same society, or Admin
    const isBillOwner = bill.residentId.toString() === req.user.id;
    let isFlatCoOccupant = false;
    if (!isBillOwner && req.user.flatNumber && bill.flatNumber) {
      const normPayerFlat = req.user.flatNumber.trim().toUpperCase().replace(/\s+/g, '');
      const normBillFlat = bill.flatNumber.trim().toUpperCase().replace(/\s+/g, '');
      if (normPayerFlat === normBillFlat) {
        isFlatCoOccupant = true;
      }
    }

    if (!isBillOwner && !isFlatCoOccupant && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to pay this maintenance bill', 403));
    }
    if (bill.status === 'Paid') return next(new ErrorResponse('Bill is already paid', 400));

    // Razorpay amount is strictly integer paise
    const amountInPaise = Math.round(bill.amount * 100);
    // Receipt length must not exceed 40 characters per Razorpay API specification
    const receiptId = `rcpt_${bill._id.toString().slice(-10)}_${Date.now().toString().slice(-8)}`;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
      notes: {
        billId: bill._id.toString(),
        residentId: bill.residentId.toString(), // Beneficiary (Payment For)
        payerId: req.user.id.toString(),       // Authenticated Payer (Paid By)
        payerName: req.user.name,
        flatNumber: bill.flatNumber,
        societyId: req.user.societyId.toString(),
        month: bill.month
      }
    };

    const activeKeyId = getRazorpayKeyId();
    const activeKeySecret = getRazorpayKeySecret();
    const isLiveConfigured = !!(
      activeKeyId &&
      activeKeyId !== 'rzp_test_dummy' &&
      activeKeyId !== 'your_razorpay_key_id' &&
      !activeKeyId.startsWith('your_') &&
      activeKeySecret &&
      activeKeySecret !== 'your_razorpay_key_secret' &&
      activeKeySecret !== 'dummy_secret' &&
      !activeKeySecret.startsWith('your_')
    );

    if (process.env.NODE_ENV === 'production' && activeKeyId.startsWith('rzp_test_')) {
      console.warn('[PAYMENT GATEWAY WARNING] Razorpay is configured with a TEST key (rzp_test_*) in production. Live resident payments cannot be processed with test credentials.');
    }

    let order;
    if (!isLiveConfigured) {
      if (process.env.NODE_ENV === 'production') {
        return next(new ErrorResponse('Payment gateway is not configured for production. Live Razorpay credentials are required.', 500));
      }
      // Mock order for isolated testing/development when live keys are absent
      order = {
        id: `order_mock_${Date.now()}`,
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt
      };
    } else {
      try {
        const instance = getRazorpayInstance();
        order = await instance.orders.create(options);
      } catch (rzpErr) {
        console.error('[RAZORPAY ORDER ERROR]', rzpErr?.error || rzpErr?.message || rzpErr);
        return next(new ErrorResponse(
          rzpErr?.error?.description || rzpErr?.message || 'Failed to create order with Razorpay',
          400
        ));
      }
    }

    // Authoritative payment initiation: Derive beneficiary from verified bill, record authenticated payer
    const payment = await Payment.create({
      societyId: req.user.societyId,
      billId: bill._id,
      residentId: bill.residentId, // Beneficiary (Payment For)
      payerId: req.user.id,        // Authenticated Payer (Paid By)
      payerName: req.user.name,
      payerEmail: req.user.email,
      flatNumber: bill.flatNumber,
      billingMonth: bill.month,
      amount: bill.amount,
      currency: 'INR',
      remainingBalance: 0,
      razorpayOrderId: order.id,
      status: 'Pending'
    });

    bill.status = 'PaymentInitiated';
    await bill.save();

    res.status(201).json({
      success: true,
      data: {
        order,
        paymentId: payment._id,
        key: isLiveConfigured ? activeKeyId : null,
        isMock: !isLiveConfigured
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment || (payment.societyId && payment.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Payment order not found', 404));
    }
    
    // Authorization: User is the payer, or the beneficiary, or Admin
    const isPayer = payment.payerId ? payment.payerId.toString() === req.user.id : false;
    const isBeneficiary = payment.residentId ? payment.residentId.toString() === req.user.id : false;
    if (!isPayer && !isBeneficiary && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized', 403));
    }
    if (payment.status === 'Success') return res.status(200).json({ success: true, message: 'Already verified', data: payment });

    // Verify signature using constant-time comparison
    const secret = getRazorpayKeySecret();
    if (!secret) {
      if (process.env.NODE_ENV === 'production' || isLiveConfigured || razorpay_signature !== 'mock_signature') {
        return next(new ErrorResponse('Payment gateway credentials not configured on server', 500));
      }
    }

    let isSignatureValid = false;
    if (secret) {
      const expectedSignature = crypto.createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(typeof razorpay_signature === 'string' ? razorpay_signature : '', 'utf8');

      if (expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
        isSignatureValid = true;
      }
    } else if (process.env.NODE_ENV !== 'production' && !isLiveConfigured && razorpay_signature === 'mock_signature') {
      // Mock bypass is strictly permitted ONLY in non-production environments when live keys are absent
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      payment.status = 'Failed';
      await payment.save();
      
      await MaintenanceBill.findOneAndUpdate({ _id: payment.billId, societyId: req.user.societyId }, { status: 'Failed' });

      // Notify resident of payment verification failure (bill remains Pending/Failed)
      notifyPaymentFailed({ paymentId: payment._id, residentId: payment.residentId, societyId: req.user.societyId }).catch(() => {});

      return next(new ErrorResponse('Invalid signature', 400));
    }

    // Success flow - Set authoritative receipt and payment fields
    payment.status = 'Success';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = Date.now();
    payment.receiptGeneratedAt = Date.now();
    if (!payment.receiptNumber) {
      payment.receiptNumber = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!payment.payerId) {
      payment.payerId = req.user.id;
      payment.payerName = req.user.name;
      payment.payerEmail = req.user.email;
    }
    payment.remainingBalance = 0;
    await payment.save();

    const bill = await MaintenanceBill.findOneAndUpdate(
      { _id: payment.billId, societyId: req.user.societyId },
      { status: 'Paid' },
      { new: true }
    );

    // Record into Finance Module for the same society (deduplicated by referenceId)
    const existingFinance = await Finance.findOne({ referenceId: payment._id });
    if (!existingFinance) {
      await Finance.create({
        societyId: req.user.societyId,
        type: 'Income',
        category: 'Maintenance',
        amount: payment.amount,
        description: `Maintenance payment for ${bill.month} - Flat ${bill.flatNumber}`,
        referenceId: payment._id
      });
    }

    // In-app notifications & transactional emails (Resident receipt + Admin ledger alert)
    // with durable deduplication via emailReceiptSent
    await notifyPaymentConfirmed({ paymentId: payment._id, societyId: req.user.societyId });

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// @desc      Get detailed official payment receipt
// @route     GET /api/payments/:id/receipt
// @access    Private (Resident: payer or beneficiary only; Admin: same society only)
exports.getPaymentReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('societyId', 'name address city state postalCode')
      .populate('residentId', 'name email flatNumber mobile phone')
      .populate('payerId', 'name email flatNumber')
      .populate('billId', 'month amount type description dueDate status createdAt');

    if (!payment) {
      return next(new ErrorResponse('Payment record not found', 404));
    }

    // Strict multi-society tenant isolation
    const rawSocietyId = req.user.societyId;
    const paymentSocietyId = payment.societyId?._id 
      ? payment.societyId._id.toString() 
      : payment.societyId?.toString();

    if (!paymentSocietyId || paymentSocietyId !== rawSocietyId.toString()) {
      return next(new ErrorResponse('Not authorized to access receipt for another society', 403));
    }

    // Receipts are only issued for successfully verified payments
    if (payment.status !== 'Success') {
      return next(new ErrorResponse('Receipt is only available for successfully verified payments', 400));
    }

    // Role-based authorization:
    // Admin: can view any receipt within their own society
    // Resident: can ONLY view receipt if they are the payer OR the bill beneficiary
    if (req.user.role === 'Resident') {
      const isPayer = payment.payerId && payment.payerId._id.toString() === req.user.id;
      const isBeneficiary = payment.residentId && payment.residentId._id.toString() === req.user.id;
      if (!isPayer && !isBeneficiary) {
        return next(new ErrorResponse('Not authorized to access another resident\'s payment receipt', 403));
      }
    } else if (req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to view payment receipts', 403));
    }

    // Determine Payer information (with honest fallback for legacy records)
    let payerInfo = {
      isAvailable: false,
      label: 'Payer information unavailable',
      name: 'Payer information unavailable',
      email: null,
      identifier: null
    };

    if (payment.payerId && payment.payerId.name) {
      payerInfo = {
        isAvailable: true,
        label: payment.payerId.name,
        name: payment.payerId.name,
        email: payment.payerId.email || null,
        identifier: payment.payerId._id
      };
    } else if (payment.payerName && payment.payerName.trim()) {
      payerInfo = {
        isAvailable: true,
        label: payment.payerName,
        name: payment.payerName,
        email: payment.payerEmail || null,
        identifier: payment.payerId || null
      };
    }

    // Beneficiary information (derived strictly from authorized bill and user)
    const beneficiaryUser = payment.residentId;
    const bill = payment.billId;
    const beneficiaryFlat = payment.flatNumber || bill?.flatNumber || beneficiaryUser?.flatNumber || 'N/A';

    const beneficiaryInfo = {
      name: beneficiaryUser?.name || 'Resident',
      email: beneficiaryUser?.email || null,
      flatNumber: beneficiaryFlat,
      residentId: beneficiaryUser?._id || null
    };

    // Society details
    const societyInfo = {
      name: payment.societyId?.name || 'SocietyHub Community',
      address: payment.societyId?.address || '',
      city: payment.societyId?.city || '',
      state: payment.societyId?.state || '',
      postalCode: payment.societyId?.postalCode || ''
    };

    // Financial breakdown
    const maintenanceAmount = bill?.amount || payment.amount;
    const additionalCharges = payment.additionalCharges || 0;
    const amountPaid = payment.amount;
    const remainingOutstanding = payment.remainingBalance || 0;

    const receiptData = {
      receiptNumber: payment.receiptNumber || `REC-${payment._id}`,
      receiptDate: payment.receiptGeneratedAt || payment.paidAt || payment.createdAt,
      paymentDate: payment.paidAt || payment.createdAt,
      status: payment.status,
      verifiedStatus: 'Verified Paid',
      currency: payment.currency || 'INR',
      amount: payment.amount,
      paymentMethod: payment.paymentMethod || 'Razorpay Online',
      transactionReference: payment.razorpayPaymentId || payment.razorpayOrderId || 'N/A',
      razorpayPaymentId: payment.razorpayPaymentId || null,
      razorpayOrderId: payment.razorpayOrderId || null,
      society: societyInfo,
      payer: payerInfo,
      beneficiary: beneficiaryInfo,
      bill: {
        billId: bill?._id || null,
        month: payment.billingMonth || bill?.month || 'Maintenance',
        type: bill?.type || 'Maintenance',
        description: bill?.description || `Maintenance fee for ${bill?.month || 'period'}`,
        dueDate: bill?.dueDate || null
      },
      breakdown: {
        maintenanceAmount,
        additionalCharges,
        totalDue: maintenanceAmount + additionalCharges,
        amountPaid,
        remainingOutstanding
      }
    };

    res.status(200).json({
      success: true,
      data: receiptData
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyPayments = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const residentId = req.user.id;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const residentObjId = mongoose.Types.ObjectId.isValid(residentId)
      ? new mongoose.Types.ObjectId(residentId)
      : residentId;

    // A resident sees payments where they are the beneficiary OR the actual authenticated payer
    const andConditions = [
      { 
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: [
          { residentId: residentObjId },
          { payerId: residentObjId }
        ]
      }
    ];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    const dateFilter = resolveDateRange(req.query);
    if (!dateFilter.isAllTime) {
      andConditions.push({
        $or: [
          { paidAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
          { paidAt: null, createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
        ]
      });
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const matchingBills = await MaintenanceBill.find({
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: [
          { residentId: residentObjId },
          { flatNumber: req.user.flatNumber }
        ],
        $and: [
          {
            $or: [
              { month: searchRegex },
              { description: searchRegex }
            ]
          }
        ]
      }).select('_id');

      const matchingBillIds = matchingBills.map(b => b._id);
      const searchOr = [
        { receiptNumber: searchRegex },
        { razorpayPaymentId: searchRegex },
        { razorpayOrderId: searchRegex },
        { payerName: searchRegex },
        { flatNumber: searchRegex },
        { billingMonth: searchRegex },
        { status: searchRegex }
      ];

      const numVal = Number(req.query.search.trim().replace(/,/g, ''));
      if (!isNaN(numVal) && numVal > 0) {
        searchOr.push({ amount: numVal });
      }

      if (matchingBillIds.length > 0) {
        searchOr.push({ billId: { $in: matchingBillIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('residentId', 'name email flatNumber')
      .populate('payerId', 'name email flatNumber')
      .populate('billId', 'month amount description dueDate status type isTransferredArrear transferNotes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: payments.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount
      },
      periodLabel: dateFilter.periodLabel,
      data: payments 
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyPaymentsSummary = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const residentId = req.user.id;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const societyMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    const dateFilter = resolveDateRange(req.query);
    const { isAllTime, startDate, endDate, periodLabel, billingMonth, monthKey, year } = dateFilter;

    const paymentDateMatch = isAllTime ? {} : {
      $or: [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };

    const billPeriodMatch = billingMonth 
      ? { month: billingMonth }
      : (isAllTime ? {} : {
          $or: [
            { dueDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        });

    // Period successful payments
    const paidAgg = await Payment.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          residentId: new mongoose.Types.ObjectId(residentId), 
          status: 'Success', 
          ...paymentDateMatch 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodTotalPaid = paidAgg[0]?.total || 0;
    const periodSuccessfulPaymentsCount = paidAgg[0]?.count || 0;

    // Period failed payments
    const failedPaymentMatch = isAllTime ? {} : {
      $or: [
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };
    const periodFailedPaymentsCount = await Payment.countDocuments({
      societyId: societyMatch,
      residentId,
      status: 'Failed',
      ...failedPaymentMatch
    });

    // Period pending maintenance dues
    const pendingBillsAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          residentId: new mongoose.Types.ObjectId(residentId), 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] }, 
          ...billPeriodMatch 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodPendingDues = pendingBillsAgg[0]?.total || 0;
    const periodPendingBillsCount = pendingBillsAgg[0]?.count || 0;

    // Lifetime totals
    const lifetimePaidAgg = await Payment.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          residentId: new mongoose.Types.ObjectId(residentId), 
          status: 'Success' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const lifetimeTotalPaid = lifetimePaidAgg[0]?.total || 0;
    const lifetimeSuccessfulPaymentsCount = lifetimePaidAgg[0]?.count || 0;

    const lifetimePendingAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          residentId: new mongoose.Types.ObjectId(residentId), 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const lifetimePendingDues = lifetimePendingAgg[0]?.total || 0;
    const lifetimePendingBillsCount = lifetimePendingAgg[0]?.count || 0;

    // Available months
    const residentMonthsAgg = await Payment.aggregate([
      { $match: { societyId: societyMatch, residentId: new mongoose.Types.ObjectId(residentId) } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$paidAt", "$createdAt"] } } } 
        } 
      }
    ]);
    const residentBillMonthsAgg = await MaintenanceBill.aggregate([
      { $match: { societyId: societyMatch, residentId: new mongoose.Types.ObjectId(residentId) } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } 
        } 
      }
    ]);

    const mSet = new Set();
    const now = new Date();
    mSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    [residentMonthsAgg, residentBillMonthsAgg].forEach(list => {
      list.forEach(i => { if (i._id) mSet.add(i._id); });
    });
    const availableMonths = Array.from(mSet).sort().reverse();
    const availableYears = Array.from(new Set(availableMonths.map(m => parseInt(m.split('-')[0], 10)))).sort().reverse();

    res.status(200).json({
      success: true,
      data: {
        periodSummary: {
          period: req.query.period || (isAllTime ? 'all' : 'custom'),
          periodLabel,
          isAllTime,
          startDate,
          endDate,
          totalPaid: periodTotalPaid,
          successfulPaymentsCount: periodSuccessfulPaymentsCount,
          failedPaymentsCount: periodFailedPaymentsCount,
          pendingDues: periodPendingDues,
          pendingBillsCount: periodPendingBillsCount
        },
        lifetimeSummary: {
          totalPaid: lifetimeTotalPaid,
          successfulPaymentsCount: lifetimeSuccessfulPaymentsCount,
          pendingDues: lifetimePendingDues,
          pendingBillsCount: lifetimePendingBillsCount
        },
        availableMonths,
        availableYears
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminPayments = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const andConditions = [
      { societyId: { $in: [societyObjId, rawSocietyId.toString()] } }
    ];

    if (req.query.status && req.query.status !== 'All') {
      andConditions.push({ status: req.query.status });
    }

    if (req.query.residentId && req.query.residentId !== 'All') {
      const resObjId = mongoose.Types.ObjectId.isValid(req.query.residentId)
        ? new mongoose.Types.ObjectId(req.query.residentId)
        : req.query.residentId;
      andConditions.push({
        $or: [{ residentId: resObjId }, { payerId: resObjId }]
      });
    }

    if (req.query.flatNumber && req.query.flatNumber.trim() && req.query.flatNumber !== 'All') {
      const flatTrim = req.query.flatNumber.trim();
      andConditions.push({
        $or: [
          { flatNumber: new RegExp(`^${flatTrim}$`, 'i') },
          { flatNumber: flatTrim }
        ]
      });
    }

    const dateFilter = resolveDateRange(req.query);
    if (!dateFilter.isAllTime) {
      andConditions.push({
        $or: [
          { paidAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
          { paidAt: null, createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
        ]
      });
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

      const matchingBills = await MaintenanceBill.find({
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: [
          { month: searchRegex },
          { description: searchRegex }
        ]
      }).select('_id');

      const matchingBillIds = matchingBills.map(b => b._id);

      const searchOr = [
        { receiptNumber: searchRegex },
        { razorpayPaymentId: searchRegex },
        { razorpayOrderId: searchRegex },
        { payerName: searchRegex },
        { payerEmail: searchRegex },
        { flatNumber: searchRegex },
        { billingMonth: searchRegex }
      ];

      if (matchingResidentIds.length > 0) {
        searchOr.push(
          { residentId: { $in: matchingResidentIds } },
          { payerId: { $in: matchingResidentIds } }
        );
      }

      if (matchingBillIds.length > 0) {
        searchOr.push({ billId: { $in: matchingBillIds } });
      }

      andConditions.push({ $or: searchOr });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('residentId', 'name email flatNumber')
      .populate('payerId', 'name email flatNumber')
      .populate('billId', 'month amount description dueDate status isTransferredArrear transferNotes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: payments.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount
      },
      periodLabel: dateFilter.periodLabel,
      data: payments 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin Payments Summary Metrics
 * GET /api/payments/admin/summary
 * Provides authoritative verified collection totals, pending dues, overdue amounts,
 * and status counts for the selected reporting period strictly scoped to the admin's society.
 */
exports.getAdminPaymentsSummary = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const societyMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    const dateFilter = resolveDateRange(req.query);

    // 1. Authoritative verified collections (Success only)
    const successMatch = {
      societyId: societyMatch,
      status: 'Success'
    };
    if (!dateFilter.isAllTime) {
      successMatch.$or = [
        { paidAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
        { paidAt: null, createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
      ];
    }
    const successAgg = await Payment.aggregate([
      { $match: successMatch },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalCollected = successAgg[0]?.total || 0;
    const successCount = successAgg[0]?.count || 0;

    // 2. Pending maintenance bills
    const billPeriodQuery = dateFilter.billingMonth 
      ? { month: dateFilter.billingMonth }
      : (dateFilter.isAllTime ? {} : {
          $or: [
            { dueDate: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } },
            { createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate } }
          ]
        });

    const pendingMatch = {
      societyId: societyMatch,
      status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] },
      ...billPeriodQuery
    };
    const pendingAgg = await MaintenanceBill.aggregate([
      { $match: pendingMatch },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalPendingDues = pendingAgg[0]?.total || 0;
    const pendingCount = pendingAgg[0]?.count || 0;

    // 3. Overdue bills
    const now = new Date();
    const overdueMatch = {
      societyId: societyMatch,
      status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] },
      dueDate: { $lt: now },
      ...billPeriodQuery
    };
    const overdueAgg = await MaintenanceBill.aggregate([
      { $match: overdueMatch },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalOverdue = overdueAgg[0]?.total || 0;
    const overdueCount = overdueAgg[0]?.count || 0;

    // 4. Failed payment attempts recorded
    const failedMatch = {
      societyId: societyMatch,
      status: 'Failed'
    };
    if (!dateFilter.isAllTime) {
      failedMatch.createdAt = { $gte: dateFilter.startDate, $lte: dateFilter.endDate };
    }
    const failedCount = await Payment.countDocuments(failedMatch);

    // 5. In-flight pending checkout attempts
    const inFlightMatch = {
      societyId: societyMatch,
      status: 'Pending'
    };
    if (!dateFilter.isAllTime) {
      inFlightMatch.createdAt = { $gte: dateFilter.startDate, $lte: dateFilter.endDate };
    }
    const inFlightCount = await Payment.countDocuments(inFlightMatch);

    res.status(200).json({
      success: true,
      periodLabel: dateFilter.periodLabel,
      data: {
        totalCollected,
        totalPendingDues,
        totalOverdue,
        successCount,
        pendingCount,
        overdueCount,
        failedCount,
        inFlightCount
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Razorpay Webhook Handler
 * POST /api/payments/webhook
 * Authenticated via HMAC-SHA256 signature on raw request body using RAZORPAY_WEBHOOK_SECRET.
 * Enforces strict multi-society isolation, durable deduplication, and atomic notification delivery.
 */
exports.handleRazorpayWebhook = async (req, res, next) => {
  try {
    // 1. Signature Verification Header Check
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
    }

    // 2. Secret Configuration Check
    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      console.error('[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET is not configured on the server');
      return res.status(500).json({ success: false, message: 'Razorpay webhook secret not configured' });
    }

    // 3. Raw Body Preservation
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : (req.rawBody
        ? Buffer.from(req.rawBody)
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})));

    // 4. Constant-Time HMAC-SHA256 Signature Verification
    const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.warn('[WEBHOOK SIGNATURE MISMATCH] Incoming x-razorpay-signature does not match HMAC-SHA256 computed with RAZORPAY_WEBHOOK_SECRET');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // 5. Payload Parsing
    let eventData;
    try {
      eventData = JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: 'Malformed webhook payload' });
    }

    const eventType = eventData.event;
    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing or invalid event field in payload' });
    }

    // 6. Durable Event Deduplication Check
    const eventId = extractEventId(req, eventData);
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return res.status(200).json({
        success: true,
        message: 'Webhook event already processed (duplicate)',
        eventId
      });
    }

    // 7. Handle Unknown / Unhandled Events Gracefully
    if (eventType !== 'order.paid' && eventType !== 'payment.failed') {
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          status: 'Ignored',
          reason: `Unhandled event type: ${eventType}`,
          payload: eventData
        });
      } catch (dupErr) {
        // Safe to ignore duplicate key collision on concurrent delivery
      }
      return res.status(200).json({
        success: true,
        message: `Event ignored: unhandled event type ${eventType}`
      });
    }

    // 8. Process Successful Payment: order.paid
    if (eventType === 'order.paid') {
      const orderPayload = eventData.payload?.order?.entity;
      const paymentPayload = eventData.payload?.payment?.entity;
      const orderId = orderPayload?.id || paymentPayload?.order_id;
      const paymentId = paymentPayload?.id;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Missing order ID in webhook payload' });
      }

      // Find locally stored payment using trusted order identifier
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        // Safe acknowledgment of unmapped order (e.g. Dashboard Send Test Event, test probes)
        try {
          await WebhookEvent.create({
            eventId,
            event: eventType,
            orderId,
            paymentId,
            status: 'Ignored',
            reason: 'Locally stored payment order not found (Dashboard Test Event or unmapped order)',
            payload: eventData
          });
        } catch (dupErr) {}

        return res.status(200).json({
          success: true,
          message: 'Payment record not found; event acknowledged',
          eventId
        });
      }

      // Find associated maintenance bill
      const bill = await MaintenanceBill.findById(payment.billId);
      if (!bill) {
        return res.status(404).json({ success: false, message: 'Associated maintenance bill not found' });
      }

      // Multi-Society Isolation Validation
      if (!payment.societyId || !bill.societyId || bill.societyId.toString() !== payment.societyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cross-society mismatch: bill and payment do not belong to the same society'
        });
      }

      // Resident Association Validation
      if (bill.residentId.toString() !== payment.residentId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Resident mismatch: bill and payment resident records do not match'
        });
      }

      // Currency and Amount Validation
      const expectedPaise = Math.round(payment.amount * 100);
      const orderAmountPaise = orderPayload?.amount !== undefined ? orderPayload.amount : paymentPayload?.amount;
      const currency = orderPayload?.currency || paymentPayload?.currency || 'INR';

      if (currency !== 'INR') {
        return res.status(400).json({
          success: false,
          message: `Currency mismatch: expected INR but received ${currency}`
        });
      }

      if (orderAmountPaise !== undefined && orderAmountPaise !== null && orderAmountPaise !== expectedPaise) {
        return res.status(400).json({
          success: false,
          message: `Amount mismatch: expected ${expectedPaise} paise but received ${orderAmountPaise} paise`
        });
      }

      if (bill.amount !== payment.amount) {
        return res.status(400).json({
          success: false,
          message: 'Bill amount does not match locally stored payment amount'
        });
      }

      // Already-Paid Bill Protection
      if (bill.status === 'Paid') {
        if (payment.status === 'Success') {
          // Idempotent retry of an already successful payment
          try {
            await WebhookEvent.create({
              eventId,
              event: eventType,
              societyId: payment.societyId,
              orderId,
              paymentId,
              billId: bill._id,
              status: 'Processed',
              reason: 'Payment was already confirmed',
              payload: eventData
            });
          } catch (dupErr) {}

          return res.status(200).json({
            success: true,
            message: 'Payment already confirmed',
            data: { paymentId: payment._id, status: payment.status }
          });
        } else {
          // Fraud / consistency check: Bill is already marked Paid by another transaction
          return res.status(400).json({
            success: false,
            message: 'Bill is already paid by another payment transaction'
          });
        }
      }

      // Transition Payment to Success if not already confirmed
      if (payment.status !== 'Success') {
        payment.status = 'Success';
        if (paymentId) payment.razorpayPaymentId = paymentId;
        payment.paidAt = paymentPayload?.created_at
          ? new Date(paymentPayload.created_at * 1000)
          : (payment.paidAt || Date.now());
        if (!payment.receiptNumber) {
          payment.receiptNumber = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (!payment.receiptGeneratedAt) {
          payment.receiptGeneratedAt = new Date();
        }
        payment.webhookProcessedAt = new Date();
        payment.webhookEventId = eventId;
        await payment.save();

        // Mark Bill as Paid
        bill.status = 'Paid';
        await bill.save();

        // Record into Finance Ledger (deduplicated by referenceId)
        const existingFinance = await Finance.findOne({ referenceId: payment._id });
        if (!existingFinance) {
          await Finance.create({
            societyId: payment.societyId,
            type: 'Income',
            category: 'Maintenance',
            amount: payment.amount,
            description: `Maintenance payment for ${bill.month} - Flat ${bill.flatNumber}`,
            referenceId: payment._id
          });
        }
      }

      // Record durable WebhookEvent
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          societyId: payment.societyId,
          orderId,
          paymentId,
          billId: bill._id,
          status: 'Processed',
          payload: eventData
        });
      } catch (dupErr) {
        // Safe to ignore duplicate key collision on concurrent delivery
      }

      // Trigger transactional receipt email to Resident + Ledger notification to Admins
      // (Deduplicated atomically via emailReceiptSent: { $ne: true })
      await notifyPaymentConfirmed({
        paymentId: payment._id,
        societyId: payment.societyId
      });

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully via webhook',
        data: {
          paymentId: payment._id,
          status: 'Success',
          receiptNumber: payment.receiptNumber
        }
      });
    }

    // 9. Process Failed Payment: payment.failed
    if (eventType === 'payment.failed') {
      const paymentPayload = eventData.payload?.payment?.entity;
      const orderId = paymentPayload?.order_id;
      const paymentId = paymentPayload?.id;

      // Locate payment by orderId or paymentId
      const searchConditions = [];
      if (orderId) searchConditions.push({ razorpayOrderId: orderId });
      if (paymentId) searchConditions.push({ razorpayPaymentId: paymentId });

      const payment = searchConditions.length > 0
        ? await Payment.findOne({ $or: searchConditions })
        : null;

      if (!payment) {
        // Safe acknowledgment of unmapped payment
        try {
          await WebhookEvent.create({
            eventId,
            event: eventType,
            status: 'Ignored',
            reason: 'Payment record not found',
            payload: eventData
          });
        } catch (dupErr) {}

        return res.status(200).json({
          success: true,
          message: 'Payment record not found; event acknowledged'
        });
      }

      // Protection: NEVER allow a failed event to override an already confirmed successful payment!
      if (payment.status === 'Success') {
        try {
          await WebhookEvent.create({
            eventId,
            event: eventType,
            societyId: payment.societyId,
            orderId: payment.razorpayOrderId,
            paymentId,
            billId: payment.billId,
            status: 'Ignored',
            reason: 'Payment already confirmed as successful; cannot override',
            payload: eventData
          });
        } catch (dupErr) {}

        return res.status(200).json({
          success: true,
          message: 'Ignored: Payment is already confirmed as successful'
        });
      }

      // Update payment record to Failed
      payment.status = 'Failed';
      if (paymentId) payment.razorpayPaymentId = paymentId;
      payment.webhookProcessedAt = new Date();
      payment.webhookEventId = eventId;
      await payment.save();

      // Bill must NEVER be marked Paid. Update PaymentInitiated bills to Failed
      await MaintenanceBill.findOneAndUpdate(
        { _id: payment.billId, societyId: payment.societyId, status: { $ne: 'Paid' } },
        { status: 'Failed' }
      );

      // Notify resident of payment failure
      await notifyPaymentFailed({
        paymentId: payment._id,
        residentId: payment.residentId,
        societyId: payment.societyId
      });

      // Record durable WebhookEvent
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          societyId: payment.societyId,
          orderId: payment.razorpayOrderId,
          paymentId,
          billId: payment.billId,
          status: 'Processed',
          reason: paymentPayload?.error_description || 'Payment failed',
          payload: eventData
        });
      } catch (dupErr) {}

      return res.status(200).json({
        success: true,
        message: 'Payment failure recorded',
        data: {
          paymentId: payment._id,
          status: 'Failed'
        }
      });
    }
  } catch (err) {
    console.error('[WEBHOOK ERROR] Unhandled webhook processing error:', err.message);
    next(err);
  }
};

