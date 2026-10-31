const express = require('express');
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

const {
  loginLimiter,
  registrationLimiter,
  devResetAllLimiters
} = require('../middleware/rateLimiter');

router.post('/register', registrationLimiter, register);
router.post('/join-society', registrationLimiter, joinSociety);
router.post('/register-society', registrationLimiter, registerSociety);
router.post('/login', loginLimiter, login);
router.get('/me', verifyToken, getMe);
router.get('/my-society', verifyToken, requireRoles('Admin'), getMySociety);
router.post('/logout', verifyToken, logout);

// Authorized development reset mechanism for local debugging and test suites
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-reset-ratelimit', async (req, res) => {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      await devResetAllLimiters(clientIp);
      res.status(200).json({
        success: true,
        message: 'All rate limit stores (login and global) successfully reset for development'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = router;
