const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/authController');

// Standard Authentication
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- 🛡️ SECURE PASSWORD RECOVERY ---
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

module.exports = router;