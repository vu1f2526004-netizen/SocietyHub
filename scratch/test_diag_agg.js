const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const mongoose = require('../server/node_modules/mongoose');
const Finance = require('../server/src/models/Finance');
const User = require('../server/src/models/User');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');

(async () => {
  await connectDB();

  const admin = await User.findOne({ email: 'anshjai@98gmail.com' });
  console.log('Admin found:', admin?.name, 'societyId:', admin?.societyId);

  // Test with string societyId
  const incString = await Finance.aggregate([
    { $match: { societyId: admin.societyId.toString(), type: 'Income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Income with string:', incString);

  // Test with ObjectId societyId
  const incObjId = await Finance.aggregate([
    { $match: { societyId: new mongoose.Types.ObjectId(admin.societyId), type: 'Income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Income with ObjectId:', incObjId);

  // Test MaintenanceBill pending with string vs ObjectId
  const pendingString = await MaintenanceBill.aggregate([
    { $match: { societyId: admin.societyId.toString(), status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Pending with string:', pendingString);

  const pendingObjId = await MaintenanceBill.aggregate([
    { $match: { societyId: new mongoose.Types.ObjectId(admin.societyId), status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Pending with ObjectId:', pendingObjId);

  process.exit(0);
})();
