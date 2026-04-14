const express = require('express');
const router = express.Router();
const { 
    getSettings, updateSettings, 
    bulkUploadParticipants, 
    getAllUsers, updateUserRole, deleteUser,
    generateBulkBadges, pairBadge,
    updateParticipant, deleteParticipant, purgeDatabase,
    getAllParticipants // <-- Fetches the roster for the scanner search box
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// =========================================================================
// 🔓 1. VOLUNTEER ZONE (Above the Admin Wall)
// Volunteers need these routes to run the registration desk and check locks
// =========================================================================
router.get('/settings', protect, getSettings);
router.post('/pair-badge', protect, pairBadge); 
router.get('/participants', protect, getAllParticipants); 

// =========================================================================
// 🔒 2. THE ADMIN WALL 
// Everything below this line requires Master or standard Admin privileges
// =========================================================================
router.use(protect, adminOnly);

// ⚙️ 3. UPDATE SETTINGS (Protected)
router.put('/settings', updateSettings);

// Data Management
router.post('/bulk-upload', bulkUploadParticipants);

// Staff/Role Management
router.route('/users')
    .get(getAllUsers);
    
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Secure Hardware Token Engine
router.get('/generate-badges', generateBulkBadges);

// God Mode Controls
router.route('/participants/:id')
    .put(updateParticipant)
    .delete(deleteParticipant);

// --- 🚨 DANGER ZONE ---
router.delete('/purge', purgeDatabase);

module.exports = router;