const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    googleLogin // <-- 1. Import the new Google Auth function
} = require('../controllers/authController');

// Standard Authentication
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- 🛡️ SECURE PASSWORD RECOVERY ---
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

// --- 🌐 GOOGLE OAUTH ---
router.post('/google', googleLogin); // <-- 2. Expose the Google route

module.exports = router;