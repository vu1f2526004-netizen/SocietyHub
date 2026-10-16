const express = require('express');
const upload = require('../middleware/upload');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaint,
  adminUpdateComplaint,
  staffUpdateComplaint,
  getAssignedTasks
} = require('../controllers/complaintController');

const router = express.Router();
router.use(verifyToken);

// Role-based root list endpoint
router.get('/', (req, res, next) => {
  if (req.user.role === 'Admin') return getAllComplaints(req, res, next);
  if (req.user.role === 'Resident') return getMyComplaints(req, res, next);
  if (req.user.role === 'SecurityStaff') return getAssignedTasks(req, res, next);
  next();
});

// Resident Routes
router.post('/', requireRoles('Resident'), upload.single('photo'), createComplaint);
router.get('/my', requireRoles('Resident'), getMyComplaints);

// Admin Routes
router.get('/admin', requireRoles('Admin'), getAllComplaints);
router.patch('/admin/:id', requireRoles('Admin'), adminUpdateComplaint);

// Staff Routes
router.get('/staff/assigned', requireRoles('SecurityStaff'), getAssignedTasks);
router.patch('/staff/:id/status', requireRoles('SecurityStaff'), upload.single('completionPhoto'), staffUpdateComplaint);

// Shared / General
router.get('/:id', getComplaint);

module.exports = router;
