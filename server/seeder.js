const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Society = require('./src/models/Society');
const User = require('./src/models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const importData = async () => {
  try {
    // 1. Ensure the default legacy/demo society exists
    let demoSociety = await Society.findOne({ name: 'Green Valley Society' });
    if (!demoSociety) {
      demoSociety = await Society.create({
        name: 'Green Valley Society',
        address: '100 Green Avenue, Sector 4',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        status: 'Active'
      });
      console.log('Demo society created:', demoSociety.name, `[Join Code: ${demoSociety.joinCode}]`);
    } else {
      console.log('Demo society already exists:', demoSociety.name, `[Join Code: ${demoSociety.joinCode}]`);
    }

    // 2. Ensure Admin User
    let adminUser = await User.findOne({ email: 'admin@society.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@society.com',
        password: 'password123',
        role: 'Admin',
        societyId: demoSociety._id,
        status: 'Active'
      });
      console.log('Admin user created');
    } else if (!adminUser.societyId) {
      adminUser.societyId = demoSociety._id;
      adminUser.status = 'Active';
      await adminUser.save();
      console.log('Admin user associated with demo society');
    }

    // Associate createdBy on society if missing
    if (!demoSociety.createdBy) {
      demoSociety.createdBy = adminUser._id;
      await demoSociety.save();
    }

    // 3. Ensure Resident User
    let residentUser = await User.findOne({ email: 'residenta@society.com' });
    if (!residentUser) {
      residentUser = await User.create({
        name: 'Resident A',
        email: 'residenta@society.com',
        password: 'password123',
        role: 'Resident',
        flatNumber: 'A-101',
        societyId: demoSociety._id,
        status: 'Active'
      });
      console.log('Resident user created');
    } else if (!residentUser.societyId) {
      residentUser.societyId = demoSociety._id;
      residentUser.status = 'Active';
      await residentUser.save();
      console.log('Resident user associated with demo society');
    }

    // 4. Ensure Staff User
    let staffUser = await User.findOne({ email: 'staff@society.com' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Staff One',
        email: 'staff@society.com',
        password: 'password123',
        role: 'SecurityStaff',
        societyId: demoSociety._id,
        status: 'Active'
      });
      console.log('Staff user created');
    } else if (!staffUser.societyId) {
      staffUser.societyId = demoSociety._id;
      staffUser.status = 'Active';
      await staffUser.save();
      console.log('Staff user associated with demo society');
    }

    console.log('Seeder check complete. Demo users & society association ensured safely.');
    process.exit();
  } catch (err) {
    console.error('Seeder failed:', err);
    process.exit(1);
  }
};

importData();
