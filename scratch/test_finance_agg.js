const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function checkAgg() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({ email: String, societyId: mongoose.Schema.Types.ObjectId }));
  const Finance = mongoose.model('Finance', new mongoose.Schema({ societyId: mongoose.Schema.Types.ObjectId, type: String, amount: Number, date: Date }));
  const MaintenanceBill = mongoose.model('MaintenanceBill', new mongoose.Schema({ societyId: mongoose.Schema.Types.ObjectId, amount: Number, status: String }));

  const admin = await User.findOne({ email: 'anshjai@98gmail.com' });
  console.log('Admin:', admin.email, 'societyId:', admin.societyId, typeof admin.societyId);

  // 1. With string societyId:
  const incomeStr = await Finance.aggregate([
    { $match: { societyId: admin.societyId.toString(), type: 'Income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Income with string societyId:', incomeStr);

  // 2. With ObjectId societyId:
  const incomeObjId = await Finance.aggregate([
    { $match: { societyId: new mongoose.Types.ObjectId(admin.societyId), type: 'Income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Income with ObjectId societyId:', incomeObjId);

  // 3. Pending bills with string vs ObjectId:
  const pendingStr = await MaintenanceBill.aggregate([
    { $match: { societyId: admin.societyId.toString(), status: { $in: ['Pending', 'PaymentInitiated', 'Overdue'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Pending bills with string societyId:', pendingStr);

  const pendingObjId = await MaintenanceBill.aggregate([
    { $match: { societyId: new mongoose.Types.ObjectId(admin.societyId), status: { $in: ['Pending', 'PaymentInitiated', 'Overdue'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  console.log('Pending bills with ObjectId societyId:', pendingObjId);

  // 4. Also check what status pending bills have!
  // In financeController:
  // status: { $in: ['Pending', 'Overdue'] }
  // BUT what status do unpaid bills have when payment is initiated or failed?
  // 'PaymentInitiated', 'Pending', 'Overdue', 'Failed'
  // In the DB earlier: bill '6acf8b37c579a4bffbf87bf5' had status: 'PaymentInitiated'!
  // Did financeController include 'PaymentInitiated' in pendingBills? NO! It only had ['Pending', 'Overdue']!

  await mongoose.disconnect();
}

checkAgg().catch(console.error);
