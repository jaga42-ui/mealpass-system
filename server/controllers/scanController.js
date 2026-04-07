const Participant = require('../models/Participant');
const Scan = require('../models/Scan');
const speakeasy = require('speakeasy');

// @desc    Verify Hybrid QR Code (Dynamic or Static) & Log Meal
// @route   POST /api/scans/verify
// @access  Private (Volunteers/Admins only)
exports.verifyAndLogScan = async (req, res) => {
    try {
        const { qrId, totp, mealType } = req.body;
        const scannedBy = req.user.id; 

        // Notice we removed 'totp' from this strict requirement!
        if (!qrId || !mealType) {
            return res.status(400).json({ message: 'Missing qrId or mealType.' });
        }

        // Use a case-insensitive search just in case the scanner reads lowercase
        const participant = await Participant.findOne({ 
            qrId: new RegExp(`^${qrId.trim()}$`, 'i'), 
            isActive: true 
        });
        
        if (!participant) {
            return res.status(404).json({ message: 'Access Denied: Participant not found or inactive.' });
        }

        // THE HYBRID CHECK: Only run the 30-second math if a TOTP token was provided
        if (totp) {
            const isValid = speakeasy.totp.verify({
                secret: participant.totpSecret,
                encoding: 'base32',
                token: totp,
                window: 1 // Allows a 30-second grace period before/after
            });

            if (!isValid) {
                return res.status(401).json({ 
                    message: 'Access Denied: Dynamic QR Code expired. Ask user to refresh.' 
                });
            }
        }

        // DUPLICATE CHECK: This protects BOTH dynamic app users and physical card holders
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        const existingScan = await Scan.findOne({
            participantId: participant._id,
            mealType: mealType,
            scanDate: today
        });

        if (existingScan) {
            return res.status(409).json({
                message: `ALREADY SERVED: Participant already had ${mealType} today.`,
                participant: {
                    name: participant.name,
                    photoUrl: participant.photoUrl 
                }
            });
        }

        // Log the Scan
        await Scan.create({
            participantId: participant._id,
            mealType: mealType,
            scanDate: today,
            scannedBy: scannedBy
        });

        return res.status(200).json({
            message: 'ACCESS GRANTED',
            participant: {
                name: participant.name,
                category: participant.category,
                department: participant.department,
                photoUrl: participant.photoUrl,
                metadata: participant.metadata // Send metadata back so the scanner UI can show it!
            }
        });

    } catch (error) {
        console.error('Scanner Error:', error);
        res.status(500).json({ message: 'Server error during scan.' });
    }
};

// @desc    Get today's scan statistics
// @route   GET /api/scans/stats
// @access  Private (Admin Only)
exports.getTodayStats = async (req, res) => {
    try {
        // Match today's date in IST (the same format we used to save scans)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        // MongoDB Aggregation: Find all scans from today, group them by mealType, and count them
        const stats = await Scan.aggregate([
            { $match: { scanDate: today } },
            { $group: { _id: '$mealType', count: { $sum: 1 } } }
        ]);

        // Default structure so the frontend always has numbers, even if 0
        const formattedStats = { Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 };
        let total = 0;

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            total += stat.count;
        });

        res.status(200).json({ date: today, stats: formattedStats, total });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ message: 'Server error fetching stats.' });
    }
};

// 🚀 THE MISSING FUNCTION: Get Detailed Scan History for the PDF
// @desc    Get complete history of all scans
// @route   GET /api/scans/history
// @access  Private (Admin Only)
exports.getScanHistory = async (req, res) => {
    try {
        // Find all scans, populate the participant's name and category using 'participantId', sort by newest first
        const scans = await Scan.find()
            .populate('participantId', 'name category metadata') 
            .sort({ createdAt: -1 }); 
            
        // Map it so the frontend receives a clean object
        const formattedScans = scans.map(scan => ({
            _id: scan._id,
            mealType: scan.mealType,
            scanDate: scan.scanDate,
            scannedAt: scan.createdAt,
            participant: scan.participantId ? {
                name: scan.participantId.name,
                category: scan.participantId.category
            } : null
        }));

        res.status(200).json(formattedScans);
    } catch (error) {
        console.error('History Error:', error);
        res.status(500).json({ message: 'Failed to fetch scan history' });
    }
};