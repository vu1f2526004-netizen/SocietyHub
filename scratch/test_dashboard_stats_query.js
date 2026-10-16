const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const mongoose = require('../server/node_modules/mongoose');
const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Complaint = require('../server/src/models/Complaint');
const Repair = require('../server/src/models/Repair');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Finance = require('../server/src/models/Finance');
const Visitor = require('../server/src/models/Visitor');
const CommunityIssue = require('../server/src/models/CommunityIssue');
const Payment = require('../server/src/models/Payment');

(async () => {
  await connectDB();
  const admin = await User.findOne({ email: 'anshjai@98gmail.com' });
  const rawSocietyId = admin.societyId;
  const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId)
    ? new mongoose.Types.ObjectId(rawSocietyId)
    : rawSocietyId;
  const socMatch = { $in: [societyObjId, rawSocietyId.toString()] };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    residentsCount,
    staffCount,
    pendingComplaintsCount,
    activeRepairsCount,
    pendingBillsAgg,
    monthIncomeAgg,
    monthExpenseAgg,
    visitorsTodayCount,
    pendingIssuesCount,
    recentComplaints,
    recentPayments
  ] = await Promise.all([
    User.countDocuments({ societyId: socMatch, role: 'Resident', status: 'Active' }),
    User.countDocuments({ societyId: socMatch, role: 'SecurityStaff', status: 'Active' }),
    Complaint.countDocuments({ societyId: socMatch, status: 'Pending' }),
    Repair.countDocuments({ societyId: socMatch, status: { $in: ['Assigned', 'In Progress'] } }),
    MaintenanceBill.aggregate([
      { $match: { societyId: socMatch, status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Finance.aggregate([
      { $match: { societyId: socMatch, type: 'Income', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Finance.aggregate([
      { $match: { societyId: socMatch, type: 'Expense', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Visitor.countDocuments({
      societyId: socMatch,
      $or: [
        { entryTimestamp: { $gte: todayStart, $lte: todayEnd } },
        { expectedDate: { $gte: todayStart, $lte: todayEnd } },
        { createdAt: { $gte: todayStart, $lte: todayEnd } }
      ]
    }),
    CommunityIssue.countDocuments({ societyId: socMatch, status: 'Pending' }),
    Complaint.find({ societyId: socMatch })
      .populate('createdBy', 'name flatNumber')
      .sort({ createdAt: -1 })
      .limit(5),
    Payment.find({ societyId: socMatch })
      .populate('residentId', 'name flatNumber')
      .populate('billId', 'month amount')
      .sort({ createdAt: -1 })
      .limit(5)
  ]);

  console.log('--- DASHBOARD STATS QUERY RESULTS ---');
  console.log('Total Residents:', residentsCount);
  console.log('Total Security Staff:', staffCount);
  console.log('Pending Complaints:', pendingComplaintsCount);
  console.log('Active Repairs:', activeRepairsCount);
  console.log('Pending Dues:', pendingBillsAgg[0]?.total || 0);
  console.log('Monthly Income:', monthIncomeAgg[0]?.total || 0);
  console.log('Monthly Expense:', monthExpenseAgg[0]?.total || 0);
  console.log('Today\'s Visitors:', visitorsTodayCount);
  console.log('Pending Issues:', pendingIssuesCount);
  console.log('Recent Complaints count:', recentComplaints.length);
  console.log('Recent Payments count:', recentPayments.length);

  process.exit(0);
})();
