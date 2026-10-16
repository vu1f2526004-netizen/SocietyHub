const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });
const connectDB = require('../server/src/config/db');

(async () => {
  await connectDB();
  const MaintenanceBill = require('../server/src/models/MaintenanceBill');
  console.log('Testing partialFilterExpression index...');
  try {
    await MaintenanceBill.collection.createIndex(
      { societyId: 1, billingPeriodKey: 1 },
      { unique: true, partialFilterExpression: { billingPeriodKey: { $type: 'string' } } }
    );
    console.log('SUCCESS: partialFilterExpression index created!');
  } catch (err) {
    console.error('Error creating index:', err.message);
  }
  const indexes = await MaintenanceBill.collection.indexes();
  console.log('Indexes on maintenancebills:', indexes.map(i => i.name));
  await mongoose.disconnect();
})();
