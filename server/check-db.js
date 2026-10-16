const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function checkDb() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub');
  console.log('Connected to DB');
  const users = await User.find({}, 'name email password role');
  console.log('Users in DB:', users);
  mongoose.disconnect();
}
checkDb();
