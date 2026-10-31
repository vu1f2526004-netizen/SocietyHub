const express = require('express');
const { contactLimiter, submitContact } = require('../controllers/contactController');

const router = express.Router();

// POST /api/contact - Public inquiry submission
router.post('/', contactLimiter, submitContact);

module.exports = router;
