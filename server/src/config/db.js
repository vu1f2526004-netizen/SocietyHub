const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('[FATAL CONFIG] MONGO_URI is not set in environment variables. Please provide a valid MongoDB connection string.');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    if (err.message && (err.message.includes('whitelist') || err.message.includes('Could not connect to any servers'))) {
      console.error('\n--> Atlas Security Tip: Please go to MongoDB Atlas -> Network Access -> IP Access List and add your current IP address (or 0.0.0.0/0 to allow access from any IP).\n');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
