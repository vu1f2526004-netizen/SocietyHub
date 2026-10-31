const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const Finance = require('../models/Finance');
const MaintenanceBill = require('../models/MaintenanceBill');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { resolveDateRange } = require('../utils/dateRangeHelper');

// @desc      Create finance record (Expense or Income)
// @route     POST /api/finance/admin
// @access    Private (Admin only)
exports.createFinanceRecord = async (req, res, next) => {
  try {
    const { 
      type, 
      title, 
      category, 
      amount, 
      description, 
      date, 
      vendor, 
      referenceNumber, 
      paymentStatus 
    } = req.body;
    
    if (!type || !['Income', 'Expense'].includes(type)) {
      return next(new ErrorResponse('Transaction type must be Income or Expense', 400));
    }

    if (!category || !category.trim()) {
      return next(new ErrorResponse('Category is required', 400));
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new ErrorResponse('Amount must be a valid number greater than zero', 400));
    }

    if (!description || !description.trim()) {
      return next(new ErrorResponse('Description and business purpose are required', 400));
    }

    // Determine receiptUrl from file upload (Cloudinary) or text field
    let receiptUrl;
    if (req.file && req.file.path) {
      receiptUrl = req.file.path;
    } else if (req.body.receiptUrl && typeof req.body.receiptUrl === 'string') {
      receiptUrl = req.body.receiptUrl.trim();
    }

    const record = await Finance.create({
      societyId: req.user.societyId, // Strict server-side society assignment
      type,
      title: title && title.trim() ? title.trim() : category.trim(),
      category: category.trim(),
      amount: parsedAmount,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      vendor: vendor && vendor.trim() ? vendor.trim() : undefined,
      referenceNumber: referenceNumber && referenceNumber.trim() ? referenceNumber.trim() : undefined,
      paymentStatus: paymentStatus && ['Paid', 'Pending'].includes(paymentStatus) ? paymentStatus : 'Paid',
      receiptUrl,
      recordedBy: req.user.id
    });

    const populatedRecord = await Finance.findById(record._id)
      .populate('recordedBy', 'name email');

    res.status(201).json({ success: true, data: populatedRecord });
  } catch (err) {
    next(err);
  }
};

// @desc      Update finance record
// @route     PATCH /api/finance/admin/:id
// @access    Private (Admin only)
exports.updateFinanceRecord = async (req, res, next) => {
  try {
    const record = await Finance.findById(req.params.id);
    if (!record) {
      return next(new ErrorResponse('Financial record not found', 404));
    }

    // Strict multi-society isolation
    if (record.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to modify another society\'s financial record', 403));
    }

    // Protect historical payment receipts from tampering
    if (record.referenceId && record.type === 'Income') {
      return next(new ErrorResponse('Cannot modify an automated verified payment ledger entry', 400));
    }

    const { 
      title, 
      category, 
      amount, 
      description, 
      date, 
      vendor, 
      referenceNumber, 
      paymentStatus 
    } = req.body;

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return next(new ErrorResponse('Amount must be a valid number greater than zero', 400));
      }
      record.amount = parsedAmount;
    }

    if (title !== undefined) record.title = title.trim();
    if (category !== undefined && category.trim()) record.category = category.trim();
    if (description !== undefined && description.trim()) record.description = description.trim();
    if (date !== undefined) record.date = new Date(date);
    if (vendor !== undefined) record.vendor = vendor.trim();
    if (referenceNumber !== undefined) record.referenceNumber = referenceNumber.trim();
    if (paymentStatus && ['Paid', 'Pending'].includes(paymentStatus)) {
      record.paymentStatus = paymentStatus;
    }

    if (req.file && req.file.path) {
      record.receiptUrl = req.file.path;
    } else if (req.body.receiptUrl !== undefined) {
      record.receiptUrl = req.body.receiptUrl.trim() || undefined;
    }

    record.updatedBy = req.user.id;
    await record.save();

    const populatedRecord = await Finance.findById(record._id)
      .populate('recordedBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({ success: true, data: populatedRecord });
  } catch (err) {
    next(err);
  }
};

// @desc      Delete manual finance record
// @route     DELETE /api/finance/admin/:id
// @access    Private (Admin only)
exports.deleteFinanceRecord = async (req, res, next) => {
  try {
    const record = await Finance.findById(req.params.id);
    if (!record) {
      return next(new ErrorResponse('Financial record not found', 404));
    }

    // Strict multi-society isolation
    if (record.societyId.toString() !== req.user.societyId.toString()) {
      return next(new ErrorResponse('Not authorized to delete another society\'s financial record', 403));
    }

    // Do not allow deleting payment transactions
    if (record.referenceId) {
      return next(new ErrorResponse('Cannot delete an automated payment-linked financial record', 400));
    }

    await Finance.deleteOne({ _id: record._id });
    res.status(200).json({ success: true, message: 'Financial record deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc      Get admin finance records with filtering and pagination
// @route     GET /api/finance/admin
// @access    Private (Admin only)
exports.getAdminFinance = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const filter = { societyId: { $in: [societyObjId, rawSocietyId.toString()] } };
    
    if (req.query.type && req.query.type !== 'All') {
      filter.type = req.query.type;
    }
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    if (req.query.paymentStatus && req.query.paymentStatus !== 'All') {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Comprehensive period and date range resolution
    const dateFilter = resolveDateRange(req.query);
    if (!dateFilter.isAllTime) {
      filter.date = {
        $gte: dateFilter.startDate,
        $lte: dateFilter.endDate
      };
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchingResidents = await User.find({
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { flatNumber: searchRegex }
        ]
      }).select('_id');
      const matchingResidentIds = matchingResidents.map(r => r._id);

      const paymentSearchOr = [
        { receiptNumber: searchRegex },
        { razorpayPaymentId: searchRegex },
        { razorpayOrderId: searchRegex }
      ];
      if (matchingResidentIds.length > 0) {
        paymentSearchOr.push({ residentId: { $in: matchingResidentIds } });
      }

      const matchingPayments = await Payment.find({
        societyId: { $in: [societyObjId, rawSocietyId.toString()] },
        $or: paymentSearchOr
      }).select('_id');
      const matchingPaymentIds = matchingPayments.map(p => p._id);

      const searchOr = [
        { title: searchRegex },
        { description: searchRegex },
        { vendor: searchRegex },
        { referenceNumber: searchRegex },
        { category: searchRegex }
      ];

      if (matchingPaymentIds.length > 0) {
        searchOr.push({ referenceId: { $in: matchingPaymentIds } });
      }

      filter.$or = searchOr;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await Finance.countDocuments(filter);
    const records = await Finance.find(filter)
      .populate('recordedBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate({
        path: 'referenceId',
        select: 'amount razorpayPaymentId razorpayOrderId paidAt status receiptNumber residentId billId',
        populate: [
          { path: 'residentId', select: 'name email flatNumber' },
          { path: 'billId', select: 'month amount dueDate' }
        ]
      })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: records.length, 
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount
      },
      periodLabel: dateFilter.periodLabel,
      data: records 
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get Society Expense Transparency for Residents & Admins
// @route     GET /api/finance/transparency
// @access    Private (Resident and Admin only, SecurityStaff rejected)
exports.getSocietyTransparency = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    if (!rawSocietyId) {
      return next(new ErrorResponse('User is not associated with any society', 400));
    }

    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const societyMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    // Determine date range filter using unified resolveDateRange helper
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dateFilter = resolveDateRange(req.query);
    const { isAllTime, startDate, endDate, periodLabel, monthKey } = dateFilter;
    const selectedMonth = monthKey || (isAllTime ? 'ALL' : (req.query.period === 'custom' ? 'CUSTOM' : currentMonthKey));

    const dateQuery = isAllTime ? {} : { date: { $gte: startDate, $lte: endDate } };

    // 1. Total Confirmed Collected Maintenance Income for this period
    const incomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income', ...dateQuery } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalCollectedIncome = incomeAgg[0]?.total || 0;
    const incomeTransactionsCount = incomeAgg[0]?.count || 0;

    // 2. Total Recorded Expenses for this period
    const expenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense', ...dateQuery } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalRecordedExpenses = expenseAgg[0]?.total || 0;
    const expenseRecordsCount = expenseAgg[0]?.count || 0;

    // 3. Paid Expenses vs Pending Expenses
    const paidExpensesAgg = await Finance.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          type: 'Expense', 
          paymentStatus: { $ne: 'Pending' }, 
          ...dateQuery 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalPaidExpenses = paidExpensesAgg[0]?.total || 0;

    const pendingExpensesAgg = await Finance.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          type: 'Expense', 
          paymentStatus: 'Pending', 
          ...dateQuery 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalPendingExpenses = pendingExpensesAgg[0]?.total || 0;

    // Net Operational Balance = Collected Income - Paid Expenses
    const netOperationalBalance = totalCollectedIncome - totalPaidExpenses;

    // Opening and Closing Balances for selected period (calculated from reliable prior financial records)
    let openingBalance = 0;
    if (!isAllTime && startDate) {
      const priorIncomeAgg = await Finance.aggregate([
        { $match: { societyId: societyMatch, type: 'Income', date: { $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const priorPaidExpensesAgg = await Finance.aggregate([
        { $match: { societyId: societyMatch, type: 'Expense', paymentStatus: { $ne: 'Pending' }, date: { $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      openingBalance = (priorIncomeAgg[0]?.total || 0) - (priorPaidExpensesAgg[0]?.total || 0);
    }
    const closingBalance = openingBalance + totalCollectedIncome - totalPaidExpenses;

    // 4. Expenses by Category
    const categoryBreakdownAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense', ...dateQuery } },
      { 
        $group: { 
          _id: '$category', 
          total: { $sum: '$amount' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { total: -1 } }
    ]);

    // 5. Query Expenses List (Sanitized for Residents)
    const expenseFilter = {
      societyId: societyMatch,
      type: 'Expense',
      ...dateQuery
    };

    if (req.query.category && req.query.category !== 'All') {
      expenseFilter.category = req.query.category;
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== 'All') {
      expenseFilter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const searchOr = [
        { title: searchRegex },
        { description: searchRegex },
        { vendor: searchRegex },
        { referenceNumber: searchRegex },
        { category: searchRegex },
        { paymentStatus: searchRegex }
      ];
      const parsedNum = parseFloat(req.query.search.trim());
      if (!isNaN(parsedNum)) {
        searchOr.push({ amount: parsedNum });
      }
      expenseFilter.$or = searchOr;
    }

    const rawExpenses = await Finance.find(expenseFilter)
      .sort({ date: -1, createdAt: -1 });

    // Sanitize expense records to prevent leaking private credentials or internal user hashes
    const sanitizedExpenses = rawExpenses.map(item => ({
      _id: item._id,
      title: item.title || item.category,
      category: item.category,
      description: item.description,
      amount: item.amount,
      date: item.date,
      vendor: item.vendor || 'N/A',
      referenceNumber: item.referenceNumber || null,
      paymentStatus: item.paymentStatus || 'Paid',
      receiptUrl: item.receiptUrl || null,
      createdAt: item.createdAt
    }));

    // 6. Available months list from society records
    const distinctMonthsAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch } },
      { 
        $group: { 
          _id: { 
            $dateToString: { 
              format: "%Y-%m", 
              date: { $ifNull: ["$date", "$createdAt"] } 
            } 
          } 
        } 
      },
      { $sort: { _id: -1 } }
    ]);

    const monthsSet = new Set(distinctMonthsAgg.map(m => m._id).filter(Boolean));
    monthsSet.add(currentMonthKey);
    if (dateFilter.monthKey) monthsSet.add(dateFilter.monthKey);
    const availableMonths = Array.from(monthsSet).sort().reverse();

    // Distinct categories for filters
    const distinctCategoriesAgg = await Finance.distinct('category', { societyId: societyMatch, type: 'Expense' });

    res.status(200).json({
      success: true,
      data: {
        transparencyNotice: "Society-wide financial information — informational transparency, not your personal payable dues.",
        summary: {
          periodLabel,
          selectedMonth,
          currentMonthKey,
          openingBalance,
          totalCollectedIncome,
          incomeTransactionsCount,
          totalRecordedExpenses,
          totalPaidExpenses,
          totalPendingExpenses,
          expenseRecordsCount,
          netOperationalBalance,
          closingBalance,
          transparencyNotice: "Society-wide financial information — informational transparency, not your personal payable dues."
        },
        categoryBreakdown: categoryBreakdownAgg.map(c => ({
          category: c._id,
          total: c.total,
          count: c.count
        })),
        expenses: sanitizedExpenses,
        availableMonths,
        availableYears: Array.from(new Set(availableMonths.map(m => parseInt(m.split('-')[0], 10)))).sort().reverse(),
        availableCategories: distinctCategoriesAgg,
        accountingRules: {
          incomeDefinition: 'Only verified and confirmed member payment receipts in this period',
          expenseDefinition: 'Audited operational expenditures recorded by society administration',
          netBalanceFormula: 'Total Collected Income - Actually Paid Expenses',
          pendingExpensesNotice: 'Pending commitments represent planned or unfinalized invoices and are tracked separately',
          multiSocietyIsolation: 'Strict multi-society isolation: records belong exclusively to your authenticated society'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get admin finance summary with flexible period filtering
// @route     GET /api/finance/admin/summary
// @access    Private (Admin only)
exports.getFinanceSummary = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const societyMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Resolve selected period from query parameters
    const dateFilter = resolveDateRange(req.query);
    const { isAllTime, startDate, endDate, periodLabel, billingMonth, monthKey, year } = dateFilter;

    const periodDateQuery = isAllTime ? {} : { date: { $gte: startDate, $lte: endDate } };
    const paymentPeriodDateQuery = isAllTime ? {} : {
      $or: [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };
    const paymentFailedPeriodQuery = isAllTime ? {} : {
      $or: [
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };

    const billPeriodQuery = billingMonth 
      ? { month: billingMonth }
      : (isAllTime ? {} : {
          $or: [
            { dueDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        });

    // 2. All-Time (Lifetime) Metrics
    const lifetimeIncomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const lifetimeIncome = lifetimeIncomeAgg[0]?.total || 0;

    const lifetimeExpenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const lifetimeExpense = lifetimeExpenseAgg[0]?.total || 0;
    const lifetimeNetBalance = lifetimeIncome - lifetimeExpense;

    const lifetimePendingBillsAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const lifetimePendingDues = lifetimePendingBillsAgg[0]?.total || 0;
    const lifetimePendingBillsCount = lifetimePendingBillsAgg[0]?.count || 0;

    const lifetimeSuccessfulPaymentsCount = await Payment.countDocuments({
      societyId: societyMatch,
      status: 'Success'
    });
    const lifetimeFailedPaymentsCount = await Payment.countDocuments({
      societyId: societyMatch,
      status: 'Failed'
    });

    // 3. Selected Period Metrics
    const periodIncomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income', ...periodDateQuery } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodIncome = isAllTime ? lifetimeIncome : (periodIncomeAgg[0]?.total || 0);

    const periodExpenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense', ...periodDateQuery } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodExpense = isAllTime ? lifetimeExpense : (periodExpenseAgg[0]?.total || 0);
    const periodNetBalance = periodIncome - periodExpense;

    const periodPendingBillsAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] },
          ...billPeriodQuery
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodPendingDues = isAllTime ? lifetimePendingDues : (periodPendingBillsAgg[0]?.total || 0);
    const periodPendingBillsCount = isAllTime ? lifetimePendingBillsCount : (periodPendingBillsAgg[0]?.count || 0);

    const periodSuccessfulPaymentsCount = isAllTime 
      ? lifetimeSuccessfulPaymentsCount 
      : await Payment.countDocuments({
          societyId: societyMatch,
          status: 'Success',
          ...paymentPeriodDateQuery
        });

    const periodFailedPaymentsCount = isAllTime 
      ? lifetimeFailedPaymentsCount 
      : await Payment.countDocuments({
          societyId: societyMatch,
          status: 'Failed',
          ...paymentFailedPeriodQuery
        });

    // 4. Current Calendar Month Performance
    const currentMonthIncomeAgg = await Finance.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          type: 'Income',
          date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const currentMonthIncome = currentMonthIncomeAgg[0]?.total || 0;

    const currentMonthExpenseAgg = await Finance.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          type: 'Expense',
          date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const currentMonthExpense = currentMonthExpenseAgg[0]?.total || 0;
    const currentMonthNetBalance = currentMonthIncome - currentMonthExpense;

    // 5. Expenses by Category for Period
    const byCategory = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense', ...periodDateQuery } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // 6. Grouped Monthly Reports
    const monthlyIncomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income' } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalIncome: { $sum: "$amount" }
        } 
      }
    ]);

    const monthlyExpenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense' } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalExpense: { $sum: "$amount" }
        } 
      }
    ]);

    const monthlyPaymentsAgg = await Payment.aggregate([
      { $match: { societyId: societyMatch, status: 'Success' } },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m", 
              date: { $ifNull: ["$paidAt", "$createdAt"] } 
            } 
          },
          successfulPaymentsCount: { $sum: 1 },
          paymentAmount: { $sum: "$amount" }
        }
      }
    ]);

    const monthlyPendingBillsAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          pendingBillsCount: { $sum: 1 },
          pendingAmount: { $sum: "$amount" }
        }
      }
    ]);

    const monthSet = new Set();
    monthSet.add(currentMonthKey);
    if (dateFilter.monthKey) {
      monthSet.add(dateFilter.monthKey);
    }

    [monthlyIncomeAgg, monthlyExpenseAgg, monthlyPaymentsAgg, monthlyPendingBillsAgg].forEach(list => {
      list.forEach(item => {
        if (item._id) monthSet.add(item._id);
      });
    });

    const incomeMap = Object.fromEntries(monthlyIncomeAgg.map(i => [i._id, i.totalIncome]));
    const expenseMap = Object.fromEntries(monthlyExpenseAgg.map(e => [e._id, e.totalExpense]));
    const paymentsMap = Object.fromEntries(monthlyPaymentsAgg.map(p => [p._id, p.successfulPaymentsCount]));
    const pendingMap = Object.fromEntries(monthlyPendingBillsAgg.map(b => [b._id, b.pendingBillsCount]));

    const sortedMonths = Array.from(monthSet).sort().reverse();
    const monthlyReport = sortedMonths.map(mKey => {
      const inc = incomeMap[mKey] || 0;
      const exp = expenseMap[mKey] || 0;
      return {
        month: mKey,
        totalIncome: inc,
        totalExpense: exp,
        netBalance: inc - exp,
        successfulPaymentsCount: paymentsMap[mKey] || 0,
        pendingBillsCount: pendingMap[mKey] || 0
      };
    });

    const availableMonths = sortedMonths;
    const availableYears = Array.from(new Set(sortedMonths.map(m => parseInt(m.split('-')[0], 10)))).sort().reverse();

    res.status(200).json({
      success: true,
      data: {
        periodSummary: {
          period: req.query.period || (isAllTime ? 'all' : 'custom'),
          periodLabel,
          isAllTime,
          startDate,
          endDate,
          totalIncome: periodIncome,
          totalExpense: periodExpense,
          netBalance: periodNetBalance,
          pendingDues: periodPendingDues,
          pendingBillsCount: periodPendingBillsCount,
          successfulTransactionsCount: periodSuccessfulPaymentsCount,
          failedTransactionsCount: periodFailedPaymentsCount
        },
        lifetimeSummary: {
          totalIncome: lifetimeIncome,
          totalExpense: lifetimeExpense,
          netBalance: lifetimeNetBalance,
          pendingDues: lifetimePendingDues,
          pendingBillsCount: lifetimePendingBillsCount,
          successfulPaymentsCount: lifetimeSuccessfulPaymentsCount,
          failedPaymentsCount: lifetimeFailedPaymentsCount
        },
        expenseByCategory: byCategory,
        monthlyReport,
        availableMonths,
        availableYears,
        currentMonthKey,
        // Backward-compatibility keys for legacy callers
        totalIncome: isAllTime ? lifetimeIncome : periodIncome,
        totalExpense: isAllTime ? lifetimeExpense : periodExpense,
        netBalance: isAllTime ? lifetimeNetBalance : periodNetBalance,
        pendingDues: isAllTime ? lifetimePendingDues : periodPendingDues,
        pendingBillsCount: isAllTime ? lifetimePendingBillsCount : periodPendingBillsCount,
        currentMonthIncome,
        currentMonthExpense,
        currentMonthNetBalance,
        accountingRules: {
          incomeSource: 'Verified financial ledger receipts and confirmed online payments',
          expenseSource: 'Recorded society administrative and operational expenditures',
          netBalanceFormula: 'Total Confirmed Income - Total Recorded Expenses',
          pendingDuesRule: 'Outstanding maintenance bills (Pending, PaymentInitiated, Overdue, Failed); excludes Paid bills',
          isolation: 'Strict multi-society tenant isolation scoped by authenticated societyId'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Get resident personal finance and payment summary for selected period
// @route     GET /api/finance/resident/summary
// @access    Private (Resident only, strictly scoped to residentId & societyId)
exports.getResidentFinanceSummary = async (req, res, next) => {
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

    // 1. Period Paid Amount & Successful Payments Count
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

    // 2. Period Failed Payments Count
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

    // 3. Period Pending Dues & Unpaid Bills Count
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

    // 4. Lifetime Totals for Resident
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

    // Distinct available months for this resident
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

    // Resident onboarding and financial responsibility tracking
    const residentUser = await User.findById(residentId).select('name flatNumber financialEffectiveDate createdAt hasTransferredArrears transferredArrearsNotes');

    // Separated calculation of legitimate regular maintenance dues vs authorized transferred arrears
    const transferredAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          residentId: new mongoose.Types.ObjectId(residentId), 
          isTransferredArrear: true,
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const transferredArrearsDues = transferredAgg[0]?.total || 0;
    const transferredArrearsCount = transferredAgg[0]?.count || 0;
    const regularMaintenanceDues = Math.max(0, periodPendingDues - transferredArrearsDues);

    res.status(200).json({
      success: true,
      data: {
        residentAccount: {
          name: residentUser?.name || 'Resident',
          flatNumber: residentUser?.flatNumber || 'N/A',
          financialEffectiveDate: residentUser?.financialEffectiveDate || residentUser?.createdAt,
          hasTransferredArrears: !!residentUser?.hasTransferredArrears,
          transferredArrearsNotes: residentUser?.transferredArrearsNotes || null,
          regularMaintenanceDues,
          transferredArrearsDues,
          transferredArrearsCount,
          totalLegitimateOutstanding: periodPendingDues
        },
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
          pendingBillsCount: periodPendingBillsCount,
          regularMaintenanceDues,
          transferredArrearsDues
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

// @desc      Get public summary
// @route     GET /api/finance/public-summary
// @access    Private (Resident and Admin)
exports.getPublicSummary = async (req, res, next) => {
  try {
    const rawSocietyId = req.user.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId) 
      ? new mongoose.Types.ObjectId(rawSocietyId) 
      : rawSocietyId;
    const societyMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const income = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income', date: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const expense = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense', date: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthTotalIncome: income[0]?.total || 0,
        monthTotalExpense: expense[0]?.total || 0,
        monthNetBalance: (income[0]?.total || 0) - (expense[0]?.total || 0),
        message: "Detailed transparent breakdowns are available in Society Accounts."
      }
    });
  } catch (err) {
    next(err);
  }
};
