require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcrypt');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    const users = await User.find({}).select('+password');
    console.log(`Found ${users.length} users`);
    for (const u of users) {
      const isBcrypt = u.password.startsWith('$2b$') || u.password.startsWith('$2a$');
      console.log(`Email: ${u.email}, Role: ${u.role}, isBcrypt: ${isBcrypt}`);
      const match = await bcrypt.compare('password123', u.password);
      console.log(`  password123 match: ${match}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
