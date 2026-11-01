const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/error');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate critical environment variables in production
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_with_secure_random_secret') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL CONFIG] JWT_SECRET must be set to a secure, random secret in production.');
    process.exit(1);
  } else {
    console.warn('[CONFIG WARNING] JWT_SECRET is using a default placeholder. Ensure a strong random secret is set for production deployment.');
  }
}

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
app.use(express.urlencoded({ extended: true }));

// Set security headers (permits cross-origin loading of static assets/documents)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Environment-aware CORS configuration
const getCorsOptions = () => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl || clientUrl === '*') {
    return { origin: true, credentials: true };
  }
  const allowed = clientUrl.split(',').map(url => url.trim().replace(/\/+$/, '')).filter(Boolean);
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Razorpay webhook dispatches)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowed.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature', 'x-razorpay-event-id']
  };
};

app.use(cors(getCorsOptions()));

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
const contact = require('./src/routes/contactRoutes');

const { globalLimiter } = require('./src/middleware/rateLimiter');

// Global API rate limiting (protects general endpoints from Denial of Service)
app.use(globalLimiter);

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
app.use('/api/contact', contact);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (err) => {
  console.error(`[UNHANDLED REJECTION] ${err?.message || err}`);
});

process.on('uncaughtException', (err) => {
  console.error(`[UNCAUGHT EXCEPTION] ${err?.message || err}`);
});

