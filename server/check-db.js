const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDb() {
  const uri = process.env.MONGO_URI;
  console.log('Connecting to MongoDB Atlas...');
  try {
    const conn = await mongoose.connect(uri);
    console.log(`Connected to MongoDB Atlas: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    const usersCount = await User.countDocuments();
    console.log(`Total Users in DB: ${usersCount}`);
    await mongoose.disconnect();
    console.log('Disconnected successfully.');
  } catch (err) {
    console.error('MongoDB Atlas Connection Error:', err.message);
  }
}
checkDb();
