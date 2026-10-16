const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  login,
  register,
  getMe,
  logout,
  registerSociety,
  getMySociety,
  joinSociety
} = require('../controllers/authController');
const { verifyToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Public registration rate limiter (prevents automated bot flooding)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 registrations per hour per IP
  message: { success: false, error: 'Too many registration requests from this IP. Please try again after an hour.' }
});

router.post('/register', registrationLimiter, register);
router.post('/join-society', registrationLimiter, joinSociety);
router.post('/register-society', registrationLimiter, registerSociety);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.get('/my-society', verifyToken, requireRoles('Admin'), getMySociety);
router.post('/logout', verifyToken, logout);

module.exports = router;
