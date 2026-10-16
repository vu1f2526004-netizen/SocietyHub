/**
 * BSON Database Backup Utility
 * Dumps all collections into standard BSON (.bson) and metadata (.metadata.json) files.
 * Output destination: .backups/pre_multisociety_backup/societyhub
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { BSON } = require('bson');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runBackup() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in server/.env');
  }

  // Parse DB name without logging sensitive credentials
  let dbName = 'societyhub';
  try {
    const url = new URL(mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    dbName = url.pathname.replace(/^\//, '') || 'societyhub';
  } catch {
    const match = mongoUri.match(/\/([^/?]+)(\?|$)/);
    if (match) dbName = match[1];
  }

  // Generate unique timestamped directory to ensure existing backups are never overwritten
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const uniqueFolder = `pre_multisociety_backup_${dateStr}`;
  const backupBaseDir = path.join(__dirname, '../../.backups', uniqueFolder);
  const targetDir = path.join(backupBaseDir, dbName);

  console.log('========================================================================');
  console.log('SOCIETYHUB BSON DATABASE BACKUP');
  console.log('========================================================================');
  console.log(`Target Database : ${dbName}`);
  console.log(`Backup Location : ${targetDir}\n`);

  fs.mkdirSync(targetDir, { recursive: true });

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  try {
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in database.`);
    
    let totalBytes = 0;
    const backupSummary = [];

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = db.collection(colName);
      const totalDocs = await col.countDocuments({});

      const docs = await col.find({}).toArray();
      const indexes = await col.indexes();

      // Serialize to binary BSON
      const bsonBuffers = docs.map(doc => BSON.serialize(doc));
      const combinedBson = Buffer.concat(bsonBuffers);

      const bsonFilePath = path.join(targetDir, `${colName}.bson`);
      const metaFilePath = path.join(targetDir, `${colName}.metadata.json`);

      fs.writeFileSync(bsonFilePath, combinedBson);
      fs.writeFileSync(metaFilePath, JSON.stringify({ indexes }, null, 2));

      const bsonStat = fs.statSync(bsonFilePath);
      const metaStat = fs.statSync(metaFilePath);
      const colBytes = bsonStat.size + metaStat.size;
      totalBytes += colBytes;

      backupSummary.push({
        collection: colName,
        docCount: totalDocs,
        bsonSize: bsonStat.size,
        metaSize: metaStat.size,
        bsonFile: path.basename(bsonFilePath)
      });

      console.log(`✓ Backed up "${colName}": ${totalDocs} documents -> ${path.basename(bsonFilePath)} (${bsonStat.size} bytes)`);
    }

    console.log('\n========================================================================');
    console.log('BACKUP VERIFICATION REPORT');
    console.log('========================================================================');
    let allValid = true;

    for (const item of backupSummary) {
      const isPopulated = item.docCount > 0;
      const hasNonZeroSize = item.bsonSize > 0;
      const status = (!isPopulated || hasNonZeroSize) ? 'VERIFIED' : 'FAILED';
      if (isPopulated && !hasNonZeroSize) allValid = false;

      console.log(`  [${status}] ${item.collection.padEnd(20)} | Docs: ${String(item.docCount).padStart(3)} | BSON: ${String(item.bsonSize).padStart(6)} bytes`);
    }

    console.log(`\nTotal collections backed up : ${backupSummary.length}`);
    console.log(`Total backup disk footprint : ${(totalBytes / 1024).toFixed(2)} KB (${totalBytes} bytes)`);
    console.log(`Backup status               : ${allValid ? 'SUCCESS - ALL BSON FILES VERIFIED' : 'FAILED'}`);
    console.log('========================================================================\n');

  } finally {
    await mongoose.disconnect();
  }
}

runBackup().catch(err => {
  console.error('Backup error:', err);
  process.exit(1);
});
