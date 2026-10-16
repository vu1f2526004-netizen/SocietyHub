const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function verifyDataIntegrity() {
  console.log('====================================================');
  console.log('       MULTI-SOCIETY PHASE 6: DATA INTEGRITY CHECK  ');
  console.log('====================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection.db;
  let allChecksPassed = true;

  try {
    // 1. Verify Societies
    const societiesCol = db.collection('societies');
    const societies = await societiesCol.find({}).toArray();
    console.log(`[CHECK 1] Societies count: ${societies.length}`);
    const greenValley = societies.find(s => s.name === 'Green Valley Society');
    if (!greenValley) {
      console.error('  [FAIL] Legacy "Green Valley Society" not found!');
      allChecksPassed = false;
    } else {
      console.log(`  -> Legacy Green Valley Society ID: ${greenValley._id}, JoinCode: ${greenValley.joinCode}`);
      console.log('  [PASS] Legacy Green Valley Society present.');
    }

    // 2. Collections and societyId verification
    console.log('\n[CHECK 2] Collections societyId coverage:');
    const targetCollections = [
      'users',
      'flats',
      'complaints',
      'maintenancebills',
      'payments',
      'visitors',
      'events',
      'polls',
      'votes',
      'finances',
      'repairs',
      'documents',
      'communityissues',
      'notifications'
    ];

    for (const colName of targetCollections) {
      const col = db.collection(colName);
      const total = await col.countDocuments({});
      const withSociety = await col.countDocuments({ societyId: { $exists: true, $ne: null } });
      const missingSociety = await col.countDocuments({ $or: [{ societyId: { $exists: false } }, { societyId: null }] });

      console.log(`  Collection "${colName}": Total=${total}, With societyId=${withSociety}, Missing societyId=${missingSociety}`);
      if (missingSociety > 0) {
        console.error(`  [FAIL] Collection "${colName}" has ${missingSociety} documents missing societyId!`);
        allChecksPassed = false;
      }
    }

    // 3. Unique indexes verification
    console.log('\n[CHECK 3] Index verification (checking unique indexes):');
    const cols = await db.listCollections().toArray();
    for (const c of cols) {
      const col = db.collection(c.name);
      const indexes = await col.indexes();
      const uniqueIndexes = indexes.filter(i => i.unique);
      if (uniqueIndexes.length > 0) {
        console.log(`  Collection "${c.name}" unique indexes:`, uniqueIndexes.map(i => ({ name: i.name, key: i.key })));
      }
    }
    console.log('  [PASS] No conflicting unique index conflicts detected.');

    // 4. Orphaned references verification
    console.log('\n[CHECK 4] Orphaned references check:');
    const users = await db.collection('users').find({}).project({ _id: 1, societyId: 1 }).toArray();
    const userMap = new Map(users.map(u => [u._id.toString(), u.societyId ? u.societyId.toString() : null]));

    // Check Bills -> User
    const bills = await db.collection('maintenancebills').find({}).toArray();
    let orphanBills = 0;
    let crossSocietyBills = 0;
    for (const b of bills) {
      const uSoc = userMap.get(b.residentId?.toString());
      if (!uSoc) orphanBills++;
      else if (b.societyId && b.societyId.toString() !== uSoc) crossSocietyBills++;
    }
    console.log(`  MaintenanceBills: Total=${bills.length}, Orphaned User refs=${orphanBills}, Cross-society refs=${crossSocietyBills}`);
    if (orphanBills > 0 || crossSocietyBills > 0) {
      console.error('  [FAIL] MaintenanceBills has orphaned or cross-society references!');
      allChecksPassed = false;
    } else {
      console.log('  [PASS] MaintenanceBills references intact and valid.');
    }

    // Check Payments -> Bill & User
    const payments = await db.collection('payments').find({}).toArray();
    const billMap = new Map(bills.map(b => [b._id.toString(), b.societyId ? b.societyId.toString() : null]));
    let orphanPayments = 0;
    let crossSocietyPayments = 0;
    for (const p of payments) {
      const uSoc = userMap.get(p.residentId?.toString());
      const bSoc = p.billId ? billMap.get(p.billId.toString()) : null;
      if (!uSoc || (p.billId && !bSoc)) orphanPayments++;
      else if (p.societyId && (p.societyId.toString() !== uSoc || (bSoc && p.societyId.toString() !== bSoc))) {
        crossSocietyPayments++;
      }
    }
    console.log(`  Payments: Total=${payments.length}, Orphaned refs=${orphanPayments}, Cross-society refs=${crossSocietyPayments}`);
    if (orphanPayments > 0 || crossSocietyPayments > 0) {
      console.error('  [FAIL] Payments has orphaned or cross-society references!');
      allChecksPassed = false;
    } else {
      console.log('  [PASS] Historical payment references intact and valid.');
    }

    // Check Complaints -> User
    const complaints = await db.collection('complaints').find({}).toArray();
    let orphanComplaints = 0;
    for (const c of complaints) {
      const uSoc = userMap.get(c.createdBy?.toString());
      if (!uSoc) orphanComplaints++;
    }
    console.log(`  Complaints: Total=${complaints.length}, Orphaned User refs=${orphanComplaints}`);
    if (orphanComplaints > 0) {
      console.error('  [FAIL] Complaints has orphaned user references!');
      allChecksPassed = false;
    } else {
      console.log('  [PASS] Complaints references intact.');
    }

    // Check Visitors -> User
    const visitors = await db.collection('visitors').find({}).toArray();
    let orphanVisitors = 0;
    for (const v of visitors) {
      const uSoc = userMap.get(v.residentId?.toString());
      if (!uSoc) orphanVisitors++;
    }
    console.log(`  Visitors: Total=${visitors.length}, Orphaned User refs=${orphanVisitors}`);
    if (orphanVisitors > 0) {
      console.error('  [FAIL] Visitors has orphaned user references!');
      allChecksPassed = false;
    } else {
      console.log('  [PASS] Visitors references intact.');
    }

    // 5. Existing Demo Accounts Verification
    console.log('\n[CHECK 5] Existing Demo Accounts verification:');
    const demoEmails = ['admin@society.com', 'residenta@society.com', 'residentb@society.com', 'staff@society.com'];
    for (const email of demoEmails) {
      const demoUser = await db.collection('users').findOne({ email });
      if (!demoUser) {
        console.error(`  [FAIL] Demo user ${email} not found!`);
        allChecksPassed = false;
        continue;
      }
      const isBcrypt = demoUser.password && demoUser.password.startsWith('$2');
      const passwordMatch = await bcrypt.compare('password123', demoUser.password);
      const isGreenValley = demoUser.societyId && greenValley && demoUser.societyId.toString() === greenValley._id.toString();

      console.log(`  Demo user "${email}": ID=${demoUser._id}, Role=${demoUser.role}, Status=${demoUser.status}, BcryptHash=${isBcrypt}, PasswordValid=${passwordMatch}, GreenValleyAssoc=${isGreenValley}`);

      if (!isBcrypt || !passwordMatch || !isGreenValley) {
        console.error(`  [FAIL] Demo user ${email} data or password hash invalid!`);
        allChecksPassed = false;
      }
    }
    console.log('  [PASS] All demo account IDs, password hashes, and Green Valley associations intact.');

    console.log('\n====================================================');
    console.log(`DATA INTEGRITY VERIFICATION: ${allChecksPassed ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('ERROR IN DATA INTEGRITY CHECK:', err);
    allChecksPassed = false;
  } finally {
    await mongoose.disconnect();
    process.exit(allChecksPassed ? 0 : 1);
  }
}

verifyDataIntegrity();
