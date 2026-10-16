const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/error');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Preserve raw body buffer for Razorpay webhook HMAC signature verification
const webhookPaths = [
  '/api/payments/webhook',
  '/api/payments/verifyPaymentByWebhook',
  '/api/v1/payments/verifyPaymentByWebhook'
];
app.use(webhookPaths, express.raw({ type: '*/*' }));

// Body parser for JSON requests with rawBody capture
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Route files
const auth = require('./src/routes/authRoutes');
const admin = require('./src/routes/adminRoutes');
const users = require('./src/routes/userRoutes');
const complaints = require('./src/routes/complaintRoutes');
const documents = require('./src/routes/documentRoutes');
const issues = require('./src/routes/issueRoutes');
const visitors = require('./src/routes/visitorRoutes');
const repairs = require('./src/routes/repairRoutes');
const bills = require('./src/routes/billRoutes');
const payments = require('./src/routes/paymentRoutes');
const finance = require('./src/routes/financeRoutes');
const events = require('./src/routes/eventRoutes');
const polls = require('./src/routes/pollRoutes');
const notifications = require('./src/routes/notificationRoutes');

const rateLimit = require('express-rate-limit');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 500 // limit each IP
});
app.use(limiter);

// Mount routers
app.use('/api/auth', auth);
app.use('/api/admin', admin);
app.use('/api/users', users);
app.use('/api/complaints', complaints);
app.use('/api/documents', documents);
app.use('/api/issues', issues);
app.use('/api/visitors', visitors);
app.use('/api/repairs', repairs);
app.use('/api/bills', bills);
app.use('/api/payments', payments);
// Backward compatibility for legacy Razorpay webhook endpoint
const { handleRazorpayWebhook } = require('./src/controllers/paymentController');
app.post('/api/v1/payments/verifyPaymentByWebhook', handleRazorpayWebhook);
app.use('/api/finance', finance);
app.use('/api/events', events);
app.use('/api/polls', polls);
app.use('/api/notifications', notifications);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
