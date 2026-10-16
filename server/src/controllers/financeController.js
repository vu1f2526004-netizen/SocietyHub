const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const Finance = require('../models/Finance');
const MaintenanceBill = require('../models/MaintenanceBill');
const Payment = require('../models/Payment');

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

// @desc      Get admin finance records with filtering
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

    if (req.query.month && req.query.month !== 'ALL') {
      const [year, month] = req.query.month.split('-').map(Number);
      if (year && month) {
        filter.date = {
          $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
          $lte: new Date(year, month, 0, 23, 59, 59, 999)
        };
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { vendor: searchRegex },
        { referenceNumber: searchRegex },
        { category: searchRegex }
      ];
    }

    const records = await Finance.find(filter)
      .populate('recordedBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
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

    // Determine date range filter
    const now = new Date();
    let startDate;
    let endDate;
    let hasDateFilter = false;
    let currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let selectedMonth = req.query.month || currentMonthKey;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      hasDateFilter = true;
      selectedMonth = 'CUSTOM';
    } else if (selectedMonth !== 'ALL') {
      const [year, month] = selectedMonth.split('-').map(Number);
      if (year && month) {
        startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
        hasDateFilter = true;
      }
    }

    const dateQuery = hasDateFilter ? { date: { $gte: startDate, $lte: endDate } } : {};

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

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      expenseFilter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { vendor: searchRegex },
        { referenceNumber: searchRegex },
        { category: searchRegex }
      ];
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
    const availableMonths = Array.from(monthsSet).sort().reverse();

    // Distinct categories for filters
    const distinctCategoriesAgg = await Finance.distinct('category', { societyId: societyMatch, type: 'Expense' });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          selectedMonth,
          currentMonthKey,
          totalCollectedIncome,
          incomeTransactionsCount,
          totalRecordedExpenses,
          totalPaidExpenses,
          totalPendingExpenses,
          expenseRecordsCount,
          netOperationalBalance
        },
        categoryBreakdown: categoryBreakdownAgg.map(c => ({
          category: c._id,
          total: c.total,
          count: c.count
        })),
        expenses: sanitizedExpenses,
        availableMonths,
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

// @desc      Get admin finance summary
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
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. All-time Income
    const incomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = incomeAgg[0]?.total || 0;

    // 2. All-time Expense
    const expenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = expenseAgg[0]?.total || 0;

    const netBalance = totalIncome - totalExpense;

    // 4. Pending Maintenance Dues
    const pendingBillsAgg = await MaintenanceBill.aggregate([
      { 
        $match: { 
          societyId: societyMatch, 
          status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const pendingDues = pendingBillsAgg[0]?.total || 0;
    const pendingBillsCount = pendingBillsAgg[0]?.count || 0;

    // 5. Current Month Income
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

    // 6. Current Month Expense
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

    // Expenses by Category
    const byCategory = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    // Group monthly income
    const monthlyIncomeAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Income' } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalIncome: { $sum: "$amount" }
        } 
      }
    ]);

    // Group monthly expense
    const monthlyExpenseAgg = await Finance.aggregate([
      { $match: { societyId: societyMatch, type: 'Expense' } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalExpense: { $sum: "$amount" }
        } 
      }
    ]);

    // Monthly payments
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

    // Monthly pending bills
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
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentMonthKey);

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

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance,
        pendingDues,
        pendingBillsCount,
        currentMonthIncome,
        currentMonthExpense,
        currentMonthNetBalance,
        expenseByCategory: byCategory,
        monthlyReport,
        currentMonthKey,
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
