const express = require('express');
const {
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  getStaffList,
  getStaffMember,
  createStaff,
  updateStaff,
  updateStaffStatus,
  getDashboardStats,
  globalSearch,
  updateResidentFinancialOnboarding
} = require('../controllers/adminController');
const { verifyToken, requireRoles, requireSociety } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication, Admin role, and society association
router.use(verifyToken);
router.use(requireRoles('Admin'));
router.use(requireSociety);

// Global Search (society-scoped across supported entities)
router.get('/global-search', globalSearch);

// Dashboard Statistics (atomic, society-scoped)
router.get('/stats', getDashboardStats);
router.get('/dashboard-stats', getDashboardStats);

// Registration Requests
router.get('/registration-requests', getRegistrationRequests);
router.patch('/registration-requests/:id/approve', approveRegistrationRequest);
router.patch('/registration-requests/:id/reject', rejectRegistrationRequest);
router.patch('/residents/:id/financial-onboarding', updateResidentFinancialOnboarding);

// Staff Management
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.get('/staff/:id', getStaffMember);
router.patch('/staff/:id', updateStaff);
router.patch('/staff/:id/status', updateStaffStatus);

module.exports = router;
