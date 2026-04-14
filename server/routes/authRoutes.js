const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    googleLogin,
    getMe // <-- 1. Import the new getMe function
} = require('../controllers/authController');

// 👇 2. Import your protect middleware so the route is secure
const { protect } = require('../middleware/authMiddleware'); 

// Standard Authentication
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- 🛡️ SECURE PASSWORD RECOVERY ---
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

// --- 🌐 GOOGLE OAUTH ---
router.post('/google', googleLogin); 

// --- 🔄 CURRENT USER STATE (For Pending Screen Polling) ---
router.get('/me', protect, getMe); // <-- 3. Add the polling route

module.exports = router;