const express = require('express');
const { getUsers, getResidents, createUser, getMe } = require('../controllers/userController');
const { verifyToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

router.get('/me', getMe);
router.get('/residents', requireRoles('Admin'), getResidents);

// Only admins can access these
router.route('/')
  .get(requireRoles('Admin'), getUsers)
  .post(requireRoles('Admin'), createUser);

module.exports = router;
