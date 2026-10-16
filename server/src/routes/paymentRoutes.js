const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  getMyPayments,
  getAdminPayments,
  handleRazorpayWebhook
} = require('../controllers/paymentController');

const router = express.Router();

// Webhook endpoints: Authenticated via Razorpay HMAC-SHA256 signature, NOT JWT
router.post('/webhook', handleRazorpayWebhook);
router.post('/verifyPaymentByWebhook', handleRazorpayWebhook);

// Protected routes requiring JWT authentication
router.use(verifyToken);

router.post('/create-order', requireRoles('Resident'), createOrder);
router.post('/verify', requireRoles('Resident'), verifyPayment);
router.get('/my', requireRoles('Resident'), getMyPayments);
router.get('/admin', requireRoles('Admin'), getAdminPayments);

module.exports = router;
