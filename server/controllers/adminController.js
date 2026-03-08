const Participant = require('../models/Participant');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Scan = require('../models/Scan');
const speakeasy = require('speakeasy');

// --- SYSTEM SETTINGS ---

exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({}); 
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings.' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { activeMeal, isScannerLocked } = req.body;
        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = new Settings();
        }

        if (activeMeal) settings.activeMeal = activeMeal;
        if (typeof isScannerLocked === 'boolean') settings.isScannerLocked = isScannerLocked;

        await settings.save();
        res.status(200).json({ message: 'System settings updated.', settings });
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings.' });
    }
};

// --- DATA MANAGEMENT ---

exports.bulkUploadParticipants = async (req, res) => {
    try {
        const participants = req.body; 
        
        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: 'No data provided.' });
        }

        const formattedData = participants.map(p => ({
            qrId: p.qrId.toUpperCase(),
            name: p.name,
            category: p.category || 'Participant',
            department: p.department || 'N/A',
            totpSecret: speakeasy.generateSecret({ length: 20 }).base32 
        }));

        const result = await Participant.insertMany(formattedData, { ordered: false });
        
        res.status(201).json({ 
            message: `Successfully uploaded ${result.length} participants.`, 
            count: result.length 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(207).json({ 
                message: 'Partial upload complete. Skipped duplicate IDs.',
                insertedCount: error.insertedDocs?.length || 0
            });
        }
        console.error('Bulk Upload Error:', error);
        res.status(500).json({ message: 'Server error during bulk upload.' });
    }
};

// --- ROLE MANAGEMENT ---

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff data.' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ message: 'User not found.' });

        // --- 🛡️ THE MASTER ADMIN LOCK 🛡️ ---
        // Nobody, not even another admin, can change this specific account
        if (user.email === 'Guruprasadjena989@gmail.com') {
            return res.status(403).json({ 
                message: "SECURITY ALERT: Master Admin credentials cannot be modified or demoted." 
            });
        }
        // ------------------------------------

        user.role = role;
        await user.save();

        res.status(200).json({ message: 'Role updated successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating role.' });
    }
};