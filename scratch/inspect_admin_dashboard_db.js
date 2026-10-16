const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

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
  const socId = admin.societyId;
  console.log('Inspecting DB for Society:', socId.toString());

  // 1. Users
  const residents = await User.find({ societyId: socId, role: 'Resident' });
  const staff = await User.find({ societyId: socId, role: 'SecurityStaff' });
  console.log(`Residents count: ${residents.length}`);
  residents.forEach(r => console.log(`  - ${r.name} (${r.email}, Flat: ${r.flatNumber}, status: ${r.status})`));
  console.log(`Staff count: ${staff.length}`);
  staff.forEach(s => console.log(`  - ${s.name} (${s.email}, status: ${s.status})`));

  // 2. Complaints
  const complaints = await Complaint.find({ societyId: socId });
  console.log(`Complaints count: ${complaints.length}`);
  complaints.forEach(c => console.log(`  - [${c.status}] ${c.title}`));

  // 3. Repairs
  const repairs = await Repair.find({ societyId: socId });
  console.log(`Repairs count: ${repairs.length}`);
  repairs.forEach(r => console.log(`  - [${r.status}] ${r.title}`));

  // 4. Maintenance Bills
  const bills = await MaintenanceBill.find({ societyId: socId });
  console.log(`Maintenance bills count: ${bills.length}`);
  bills.forEach(b => console.log(`  - [${b.status}] ${b.month}: ₹${b.amount} (Flat: ${b.flatNumber})`));

  // 5. Finance
  const finance = await Finance.find({ societyId: socId });
  console.log(`Finance records count: ${finance.length}`);
  finance.forEach(f => console.log(`  - [${f.type}] ₹${f.amount} (${f.category}: ${f.description})`));

  // 6. Visitors
  const visitors = await Visitor.find({ societyId: socId });
  console.log(`Visitors count: ${visitors.length}`);
  visitors.forEach(v => console.log(`  - [${v.status}] ${v.name} (expectedDate: ${v.expectedDate}, entryTimestamp: ${v.entryTimestamp}, createdAt: ${v.createdAt})`));

  // 7. Community Issues
  const issues = await CommunityIssue.find({ societyId: socId });
  console.log(`Community issues count: ${issues.length}`);
  issues.forEach(i => console.log(`  - [${i.status}] ${i.title}`));

  // 8. Payments
  const payments = await Payment.find({ societyId: socId });
  console.log(`Payments count: ${payments.length}`);

  process.exit(0);
})();
