const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');

(async () => {
  await connectDB();
  const User = require('../server/src/models/User');
  const Flat = require('../server/src/models/Flat');
  const MaintenanceBill = require('../server/src/models/MaintenanceBill');
  const Society = require('../server/src/models/Society');

  const societies = await Society.find();
  console.log('Societies count:', societies.length);

  for (const s of societies) {
    const residents = await User.find({ societyId: s._id, role: 'Resident' });
    const flats = await Flat.find({ societyId: s._id });
    const bills = await MaintenanceBill.find({ societyId: s._id });
    console.log('\n=======================================');
    console.log('Society:', s.name, 'ID:', s._id.toString());
    console.log('Residents count:', residents.length);
    residents.forEach(r => console.log('  Resident:', r.name, '| Email:', r.email, '| Status:', r.status, '| Flat:', r.flatNumber, '| ID:', r._id.toString()));
    console.log('Flats count:', flats.length);
    flats.forEach(f => console.log('  Flat:', f.block + '-' + f.number, '| ID:', f._id.toString(), '| Occupants:', f.occupants.map(o => o.toString())));
    console.log('Bills count:', bills.length);
    bills.forEach(b => console.log('  Bill:', b.month, '| Amount:', b.amount, '| Flat:', b.flatNumber, '| Status:', b.status, '| Resident:', b.residentId.toString()));
  }
  await mongoose.disconnect();
})();
