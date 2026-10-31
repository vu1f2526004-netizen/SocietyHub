const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { 
  createVisitor, 
  getMyVisitors, 
  getAllVisitors, 
  getGateVisitors, 
  updateVisitorStatus,
  getDestinationFlats,
  createWalkInRequest,
  getResidentPermissionRequests,
  decideResidentPermission,
  recordParcelHandover
} = require('../controllers/visitorController');

const router = express.Router();
router.use(verifyToken);

// Destination flats lookup for Security Staff and Admin
router.get('/flats', requireRoles('SecurityStaff', 'Admin'), getDestinationFlats);

// Walk-in Visitor request creation by Security Staff
router.post('/walk-in', requireRoles('SecurityStaff'), createWalkInRequest);

// Resident Gate Permission Requests
router.get('/permissions/my', requireRoles('Resident'), getResidentPermissionRequests);
router.patch('/:id/permission', requireRoles('Resident'), decideResidentPermission);

// Parcel Handover by Security Staff
router.patch('/:id/parcel-handover', requireRoles('SecurityStaff'), recordParcelHandover);

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

// Status updates (Check-in, Check-out, Deny, Cancel)
router.patch('/:id/status', requireRoles('Resident', 'SecurityStaff'), updateVisitorStatus);

module.exports = router;
