const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const Society = require('../server/src/models/Society');
const User = require('../server/src/models/User');

async function debugRegister() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  console.log('Step 1: Check existing User...');
  const existingUser = await User.findOne({ email: 'nonexistent@test.com' });
  console.log('Step 1 done, existingUser:', existingUser);

  console.log('Step 2: Check existing Society...');
  const existingSociety = await Society.findOne({ name: 'Unique Society Name', postalCode: '400001' });
  console.log('Step 2 done, existingSociety:', existingSociety);

  console.log('Step 3: Generate join code...');
  const joinCode = Society.generateJoinCode();
  console.log('Step 3 done, joinCode:', joinCode);

  console.log('Step 4: Create society...');
  const createdSociety = await Society.create({
    name: 'Unique Society Name ' + Date.now(),
    address: '123 Address',
    city: 'City',
    state: 'State',
    postalCode: '400001',
    joinCode,
    status: 'Active'
  });
  console.log('Step 4 done, society id:', createdSociety._id);

  console.log('Step 5: Create User...');
  const createdAdmin = await User.create({
    name: 'Admin Name',
    email: 'testadmin_' + Date.now() + '@test.com',
    mobile: '9876543210',
    phone: '9876543210',
    password: 'password123',
    role: 'Admin',
    societyId: createdSociety._id,
    status: 'Active'
  });
  console.log('Step 5 done, admin id:', createdAdmin._id);

  console.log('Step 6: Update society createdBy...');
  createdSociety.createdBy = createdAdmin._id;
  await createdSociety.save();
  console.log('Step 6 done');

  // cleanup
  await Society.findByIdAndDelete(createdSociety._id);
  await User.findByIdAndDelete(createdAdmin._id);
  console.log('Cleanup done');

  await mongoose.disconnect();
  console.log('Disconnected');
}

debugRegister().catch(err => {
  console.error('DEBUG ERROR:', err);
  process.exit(1);
});
