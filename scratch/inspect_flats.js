const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function checkFlats() {
  await mongoose.connect(process.env.MONGO_URI);
  const Flat = mongoose.model('Flat', new mongoose.Schema({}, { strict: false }));
  const flats = await Flat.find().limit(5);
  console.log('Sample Flats count in DB:', await Flat.countDocuments());
  console.log('Sample flats:', JSON.stringify(flats, null, 2));
  await mongoose.disconnect();
}
checkFlats();
