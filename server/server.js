const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Route Imports
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const participantRoutes = require('./routes/participantRoutes');

dotenv.config();

const app = express();

// --- PRODUCTION CORS SETUP ---
// Allows local dev by default, but locks down to your Vercel URL in production
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true 
}));

// 🚀 THE FIX: Increased payload limit to 50mb to prevent 413 errors on large uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/participants', participantRoutes);

// Basic Health Check (Good for Render to ping to keep the service awake)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Online', message: 'MealPass API is running.' });
});

// Database Connection
const PORT = process.env.PORT || 5000;
// Make sure your Render environment variables contain the MongoDB Atlas URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mealpass';

mongoose.connect(MONGO_URI)
    .then(async () => { // 🚀 Added 'async' here to handle the database index wipe
        console.log('✅ Connected to MongoDB Atlas successfully.');
        
        // 🚀 THE FIX: Destroy the old strict QR index so it allows 500+ null IDs
        try {
            await mongoose.connection.collection('participants').dropIndex('qrId_1');
            console.log('🧹 Cleared old strict QR index! Database is unlocked.');
        } catch (e) {
            // It will safely ignore this if the index is already deleted
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.error('❌ MongoDB connection error:', error));