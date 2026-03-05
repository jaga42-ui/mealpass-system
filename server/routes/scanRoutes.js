const express = require('express');
const router = express.Router();
const { verifyAndLogScan, getTodayStats } = require('../controllers/scanController');
const { getSettings } = require('../controllers/adminController'); // <-- Borrow this
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/verify', protect, verifyAndLogScan);
router.get('/stats', protect, adminOnly, getTodayStats);

// NEW: Read-only config route for the volunteer scanners
router.get('/config', protect, getSettings);

module.exports = router;