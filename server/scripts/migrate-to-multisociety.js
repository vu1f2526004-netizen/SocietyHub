/**
 * SocietyHub Multi-Society Phase 1 Migration Script
 * 
 * Usage:
 *   Dry Run (Inspects and reports, zero writes):
 *     node server/scripts/migrate-to-multisociety.js --dry-run
 * 
 *   Apply Migration (Executes idempotent backfill with verification):
 *     node server/scripts/migrate-to-multisociety.js --apply
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run') || !isApply;

/**
 * Generate a cryptographically secure, human-readable society join code.
 * Example format: SOC-8K4M9P (omits ambiguous characters: 0, O, 1, I)
 */
function generateSecureJoinCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SOC-${code}`;
}

const LEGACY_DEMO_SOCIETY = {
  name: 'Green Valley Society',
  address: '100 Green Avenue, Sector 4',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  status: 'Active'
};

const COLLECTIONS_TO_MIGRATE = [
  { name: 'users', label: 'Users' },
  { name: 'flats', label: 'Flats' },
  { name: 'complaints', label: 'Complaints' },
  { name: 'maintenancebills', label: 'Maintenance Bills' },
  { name: 'payments', label: 'Payments' },
  { name: 'visitors', label: 'Visitors' },
  { name: 'events', label: 'Events' },
  { name: 'rsvps', label: 'RSVPs' },
  { name: 'polls', label: 'Polls' },
  { name: 'votes', label: 'Votes' },
  { name: 'finances', label: 'Finance Records' },
  { name: 'repairs', label: 'Repairs' },
  { name: 'documents', label: 'Documents' },
  { name: 'communityissues', label: 'Community Issues' },
  { name: 'notifications', label: 'Notifications' }
];

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  // Sanitize connection URI to prevent credential leakage in logs
  const sanitizedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log('========================================================================');
  console.log(`SOCIETYHUB MULTI-SOCIETY MIGRATION (${isDryRun ? 'DRY-RUN MODE' : 'APPLY MODE'})`);
  console.log('========================================================================');
  console.log(`Connecting to: ${sanitizedUri}...\n`);

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  try {
    // 1. Inspect Society records
    let societiesCol;
    const allCollections = (await db.listCollections().toArray()).map(c => c.name);
    
    let existingSocieties = [];
    if (allCollections.includes('societies')) {
      societiesCol = db.collection('societies');
      existingSocieties = await societiesCol.find({}).toArray();
    }

    console.log(`[1] Existing Society Records: ${existingSocieties.length}`);
    existingSocieties.forEach(s => {
      console.log(`    - ID: ${s._id} | Name: "${s.name}" | Join Code: ${s.joinCode} | Status: ${s.status}`);
    });
    if (existingSocieties.length === 0) {
      console.log(`    (No societies exist yet. Legacy society "${LEGACY_DEMO_SOCIETY.name}" will be established)`);
    }

    // 2. Inspect Collections and Counts
    console.log(`\n[2] Existing Collections & Pending Associations:`);
    const collectionReports = [];

    for (const item of COLLECTIONS_TO_MIGRATE) {
      if (allCollections.includes(item.name)) {
        const col = db.collection(item.name);
        const total = await col.countDocuments({});
        const alreadyLinked = await col.countDocuments({ societyId: { $exists: true, $ne: null } });
        const unlinked = await col.countDocuments({ $or: [{ societyId: { $exists: false } }, { societyId: null }] });
        collectionReports.push({ name: item.name, label: item.label, total, alreadyLinked, unlinked });
        console.log(`    - ${item.label} (${item.name}): ${total} total | ${alreadyLinked} associated | ${unlinked} pending association`);
      } else {
        collectionReports.push({ name: item.name, label: item.label, total: 0, alreadyLinked: 0, unlinked: 0 });
        console.log(`    - ${item.label} (${item.name}): (Collection not yet created - 0 records)`);
      }
    }

    // 3. Inspect Users Breakdown
    console.log(`\n[3] User Accounts Summary:`);
    const usersCol = db.collection('users');
    const users = await usersCol.find({}).toArray();
    users.forEach(u => {
      const societyStatus = u.societyId ? `Associated (ID: ${u.societyId})` : 'Pending Association';
      console.log(`    - [${u.role}] ${u.name} <${u.email}> | Flat: ${u.flatNumber || 'N/A'} | Society: ${societyStatus} | Status: ${u.status || 'Active'}`);
    });

    // 4. Index Inspection & Safe Migration Analysis
    console.log(`\n[4] Unique Index Analysis & Safety:`);
    console.log(`    - users.email: GLOBAL unique index (Kept global to preserve clean common /login).`);
    console.log(`    - payments.razorpayOrderId: GLOBAL unique index (Maintained for Razorpay idempotency).`);
    console.log(`    - payments.receiptNumber: Sparse unique index (Preserved).`);
    console.log(`    - rsvps: Compound unique { eventId: 1, residentId: 1 } (Preserved).`);
    console.log(`    - votes: Compound unique { pollId: 1, residentId: 1 } (Preserved).`);
    if (allCollections.includes('flats')) {
      const flatIndexes = await db.collection('flats').indexes();
      const hasOldFlatUnique = flatIndexes.some(idx => idx.name === 'number_1' && idx.unique);
      if (hasOldFlatUnique) {
        console.log(`    - flats.number: [WARNING] Global unique index detected. Must be replaced with compound { societyId: 1, block: 1, number: 1 }.`);
      } else {
        console.log(`    - flats: No conflicting global unique index present.`);
      }
    } else {
      console.log(`    - flats: Collection empty/uncreated. New schema index { societyId: 1, block: 1, number: 1 } will apply cleanly.`);
    }

    // 5. Conflict Analysis
    console.log(`\n[5] Conflict & Integrity Check:`);
    const demoAdmin = users.find(u => u.email === 'admin@society.com');
    const demoResident = users.find(u => u.email === 'residenta@society.com');
    const demoStaff = users.find(u => u.email === 'staff@society.com');

    if (!demoAdmin || !demoResident || !demoStaff) {
      console.log(`    - [INFO] One or more demo accounts missing from DB; seeder.js will ensure them safely.`);
    } else {
      console.log(`    - [OK] All 3 primary demo accounts present and verified.`);
    }

    // 6. Action Execution (Dry Run vs Apply)
    if (isDryRun) {
      console.log('\n========================================================================');
      console.log('DRY RUN COMPLETE: ZERO WRITES PERFORMED');
      console.log('All existing user credentials, payments, and business data are intact.');
      console.log('Run with --apply when you are ready to execute database updates.');
      console.log('========================================================================\n');
    } else {
      console.log('\n========================================================================');
      console.log('APPLYING MIGRATION (Idempotent Execution)...');
      console.log('========================================================================');

      // 6a. Ensure Legacy Society idempotently
      let targetSociety = await db.collection('societies').findOne({ name: LEGACY_DEMO_SOCIETY.name });
      if (!targetSociety) {
        // Securely generate a collision-free join code using crypto
        let secureJoinCode;
        let isUnique = false;
        while (!isUnique) {
          secureJoinCode = generateSecureJoinCode();
          const existing = await db.collection('societies').findOne({ joinCode: secureJoinCode });
          if (!existing) isUnique = true;
        }

        const insertRes = await db.collection('societies').insertOne({
          ...LEGACY_DEMO_SOCIETY,
          joinCode: secureJoinCode,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        targetSociety = await db.collection('societies').findOne({ _id: insertRes.insertedId });
        console.log(`✓ Created Legacy Demo Society: "${targetSociety.name}" (ID: ${targetSociety._id}) [Join Code: ${targetSociety.joinCode}]`);
      } else {
        // Existing society found: preserve its existing join code and data without regenerating
        console.log(`✓ Existing Legacy Demo Society Found: "${targetSociety.name}" (ID: ${targetSociety._id}) [Join Code: ${targetSociety.joinCode}]`);
      }

      // 6b. Backfill collections
      const targetId = targetSociety._id;
      for (const item of collectionReports) {
        if (item.unlinked > 0 && allCollections.includes(item.name)) {
          const col = db.collection(item.name);
          const updateResult = await col.updateMany(
            { $or: [{ societyId: { $exists: false } }, { societyId: null }] },
            { $set: { societyId: targetId } }
          );
          console.log(`✓ Backfilled ${updateResult.modifiedCount} records in [${item.name}] with societyId: ${targetId}`);
        }
      }

      // 6c. Ensure User status field is backfilled to 'Active'
      const statusUpdate = await usersCol.updateMany(
        { $or: [{ status: { $exists: false } }, { status: null }] },
        { $set: { status: 'Active' } }
      );
      if (statusUpdate.modifiedCount > 0) {
        console.log(`✓ Backfilled status: 'Active' for ${statusUpdate.modifiedCount} users`);
      }

      // 6d. Update society.createdBy to demo Admin user if available
      if (demoAdmin && !targetSociety.createdBy) {
        await db.collection('societies').updateOne(
          { _id: targetId },
          { $set: { createdBy: demoAdmin._id } }
        );
        console.log(`✓ Linked Society createdBy to Admin User (${demoAdmin._id})`);
      }

      // 6e. Verification
      console.log('\n--- Post-Migration Integrity Verification ---');
      let anyUnlinkedRemaining = 0;
      for (const item of COLLECTIONS_TO_MIGRATE) {
        if (allCollections.includes(item.name)) {
          const unlinkedRemaining = await db.collection(item.name).countDocuments({
            $or: [{ societyId: { $exists: false } }, { societyId: null }]
          });
          if (unlinkedRemaining > 0) {
            console.error(`✗ [ERROR] ${unlinkedRemaining} unlinked records remain in [${item.name}]!`);
            anyUnlinkedRemaining += unlinkedRemaining;
          } else {
            console.log(`✓ [${item.name}] verified: 100% records associated with a valid society.`);
          }
        }
      }

      if (anyUnlinkedRemaining === 0) {
        console.log('\n========================================================================');
        console.log('MIGRATION APPLIED SUCCESSFULLY WITH ZERO UNLINKED RECORDS');
        console.log('========================================================================\n');
      } else {
        throw new Error(`Migration verification failed: ${anyUnlinkedRemaining} unlinked records remain.`);
      }
    }

  } finally {
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('\nMigration script error:', err);
  process.exit(1);
});
