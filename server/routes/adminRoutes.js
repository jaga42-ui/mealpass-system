const express = require('express');
const router = express.Router();
const { 
    getSettings, updateSettings, 
    bulkUploadParticipants, 
    getAllUsers, updateUserRole,
    generateBulkBadges, // <-- 1. Import the Generator
    pairBadge           // <-- 2. Import the Pairing Engine
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Lock down the entire file to Admins only
router.use(protect, adminOnly);

// System Settings
router.route('/settings')
    .get(getSettings)
    .put(updateSettings);

// Data Management
router.post('/bulk-upload', bulkUploadParticipants);

// Staff/Role Management
router.route('/users')
    .get(getAllUsers);
    
router.put('/users/:id/role', updateUserRole);

// --- 🛡️ SECURE HARDWARE TOKEN ENGINE ---
router.get('/generate-badges', generateBulkBadges);
router.post('/pair-badge', pairBadge);

module.exports = router;