const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { 
  createVisitor, 
  getMyVisitors, 
  getAllVisitors, 
  getGateVisitors, 
  updateVisitorStatus 
} = require('../controllers/visitorController');

const router = express.Router();
router.use(verifyToken);

// Root list endpoint routed by role
router.get('/', (req, res, next) => {
  if (req.user.role === 'Admin') return getAllVisitors(req, res, next);
  if (req.user.role === 'Resident') return getMyVisitors(req, res, next);
  if (req.user.role === 'SecurityStaff') return getGateVisitors(req, res, next);
  next();
});

// Resident Routes
router.post('/', requireRoles('Resident'), createVisitor);
router.get('/my', requireRoles('Resident'), getMyVisitors);

// Admin Routes (Admin only - society-wide visitor records)
router.get('/admin', requireRoles('Admin'), getAllVisitors);

// Staff Routes (SecurityStaff only - gate operations)
router.get('/staff', requireRoles('SecurityStaff'), getGateVisitors);

// Status updates (Resident can cancel Expected, SecurityStaff handles Entry/Exit)
router.patch('/:id/status', requireRoles('Resident', 'SecurityStaff'), updateVisitorStatus);

module.exports = router;
