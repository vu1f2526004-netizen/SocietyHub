const mongoose = require('mongoose');

/**
 * Normalizes MongoDB connection URI to ensure consistent database naming.
 * Specifically corrects case mismatches for Atlas database 'studyHub' (e.g. /studyhub -> /studyHub).
 */
const normalizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return uri;
  // Case-insensitively replace /studyhub database segment with exact Atlas casing /studyHub
  return uri.replace(/\/studyhub(?=[\/?#]|$)/i, '/studyHub');
};

const connectDB = async () => {
  try {
    const rawMongoUri = process.env.MONGO_URI;
    if (!rawMongoUri) {
      console.error('[FATAL CONFIG] MONGO_URI is not set in environment variables. Please provide a valid MongoDB connection string.');
      process.exit(1);
    }

    const mongoUri = normalizeMongoUri(rawMongoUri);
    if (mongoUri !== rawMongoUri) {
      console.log('[DATABASE CONFIG] Normalized MongoDB URI database name casing to "studyHub" to match Atlas cluster.');
    }

    const options = {};
    if (/\/studyHub(?=[\/?#]|$)/.test(mongoUri)) {
      options.dbName = 'studyHub';
    }

    const conn = await mongoose.connect(mongoUri, options);

    console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    if (err.message && (err.message.includes('whitelist') || err.message.includes('Could not connect to any servers'))) {
      console.error('\n--> Atlas Security Tip: Please go to MongoDB Atlas -> Network Access -> IP Access List and add your current IP address (or 0.0.0.0/0 to allow access from any IP).\n');
    }
    process.exit(1);
  }
};

connectDB.normalizeMongoUri = normalizeMongoUri;

module.exports = connectDB;
