const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function testLiveOrder() {
  console.log('Testing Razorpay Order Creation with configured Test Mode keys...\n');
  await mongoose.connect(process.env.MONGO_URI);

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String,
    societyId: mongoose.Schema.Types.ObjectId,
    flatNumber: String
  }));

  const MaintenanceBill = mongoose.model('MaintenanceBill', new mongoose.Schema({
    societyId: mongoose.Schema.Types.ObjectId,
    residentId: mongoose.Schema.Types.ObjectId,
    flatNumber: String,
    amount: Number,
    month: String,
    dueDate: Date,
    status: String
  }));

  // Find an existing resident
  const resident = await User.findOne({ role: 'Resident' });
  if (!resident) {
    console.error('No resident found');
    process.exit(1);
  }

  // Create temporary test bill in resident's society
  const testBill = await MaintenanceBill.create({
    societyId: resident.societyId,
    residentId: resident._id,
    flatNumber: resident.flatNumber || 'B-202',
    amount: 150,
    month: `Test ${Date.now()}`,
    dueDate: new Date(Date.now() + 86400000 * 7),
    status: 'Pending'
  });

  const token = jwt.sign(
    { id: resident._id, role: resident.role, societyId: resident.societyId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ billId: testBill._id })
  });

  const status = res.status;
  const data = await res.json();

  console.log('Order Creation HTTP Status:', status);
  console.log('Success:', data.success);
  console.log('isMock flag:', data.data?.isMock);
  console.log('Key returned prefix:', data.data?.key ? data.data.key.substring(0, 9) : 'none');
  console.log('Order ID:', data.data?.order?.id);
  console.log('Order ID full length:', data.data?.order?.id?.length);
  console.log('Order ID is real Razorpay order:', data.data?.order?.id?.startsWith('order_') && !data.data?.order?.id?.includes('mock'));

  // Clean up test bill
  await MaintenanceBill.findByIdAndDelete(testBill._id);
  const Payment = mongoose.model('Payment', new mongoose.Schema({ razorpayOrderId: String }));
  if (data.data?.order?.id) {
    await Payment.deleteMany({ razorpayOrderId: data.data.order.id });
  }

  await mongoose.disconnect();
}

testLiveOrder().catch(console.error);
