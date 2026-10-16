const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const topology = mongoose.connection.client?.topology;
  console.log('Topology description type:', topology?.description?.type);
  console.log('Supports replica set transactions?:', topology?.description?.type === 'ReplicaSetWithPrimary' || topology?.description?.type === 'Sharded');
  await mongoose.disconnect();
}
check();
