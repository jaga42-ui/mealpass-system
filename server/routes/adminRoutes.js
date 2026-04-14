const express = require('express');
const router = express.Router();
const { 
    getSettings, updateSettings, 
    bulkUploadParticipants, 
    getAllUsers, updateUserRole, deleteUser, // <-- Imported deleteUser here
    generateBulkBadges, 
    pairBadge,
    updateParticipant,   
    deleteParticipant,
    purgeDatabase 
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
router.delete('/users/:id', deleteUser); // <-- Added the new delete route here

// Secure Hardware Token Engine
router.get('/generate-badges', generateBulkBadges);
router.post('/pair-badge', pairBadge);

// God Mode Controls
router.route('/participants/:id')
    .put(updateParticipant)
    .delete(deleteParticipant);

// --- 🚨 DANGER ZONE ---
router.delete('/purge', purgeDatabase);

module.exports = router;