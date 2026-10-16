const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Society = mongoose.model('Society', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const societies = await Society.find();
  console.log('Total societies count:', societies.length);
  for (const s of societies) {
    console.log(`- ID: ${s._id}, Name: ${s.name}, JoinCode: ${s.joinCode}, Status: ${s.status}`);
  }

  // If there are any stray test societies created during earlier manual probe runs (e.g. Test Society 1791830647160), clean them up
  const straySocieties = await Society.find({ name: { $regex: /^Test Society/i } });
  if (straySocieties.length > 0) {
    console.log(`Found ${straySocieties.length} stray probe test societies to clean up...`);
    for (const stray of straySocieties) {
      await User.deleteMany({ societyId: stray._id });
      await Society.findByIdAndDelete(stray._id);
      console.log(`  Cleaned up stray society: ${stray._id} (${stray.name})`);
    }
  }

  const finalSocieties = await Society.find();
  console.log('\nFinal pristine societies count:', finalSocieties.length);
  for (const s of finalSocieties) {
    console.log(`- ID: ${s._id}, Name: ${s.name}, JoinCode: ${s.joinCode}`);
  }

  await mongoose.disconnect();
}

check();
