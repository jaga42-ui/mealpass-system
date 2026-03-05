const express = require('express');
const router = express.Router();
const { addParticipant, getParticipants, loginParticipant } = require('../controllers/participantController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for participants to access their QR code portal
router.post('/login', loginParticipant);

// Protected routes for admins to manage the roster
router.route('/')
    .post(protect, adminOnly, addParticipant)
    .get(protect, adminOnly, getParticipants);

module.exports = router;