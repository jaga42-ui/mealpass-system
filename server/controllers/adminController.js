const Participant = require('../models/Participant');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Scan = require('../models/Scan');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

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

        const formattedData = participants.map(p => {
            // 🚀 HYBRID FIX: We generate the digital secret now, so the Web Portal works later!
            const newParticipant = {
                name: p.name,
                category: p.category || 'Participant',
                department: p.department || 'N/A',
                totpSecret: speakeasy.generateSecret({ length: 20 }).base32 
            };

            // Only attach the qrId if it exists to prevent "null" Duplicate Key errors
            if (p.qrId && p.qrId.trim() !== '') {
                newParticipant.qrId = p.qrId.toUpperCase();
            }

            return newParticipant;
        });

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

        if (user.email === 'Guruprasadjena989@gmail.com') {
            return res.status(403).json({ 
                message: "SECURITY ALERT: Master Admin credentials cannot be modified or demoted." 
            });
        }

        user.role = role;
        await user.save();

        res.status(200).json({ message: 'Role updated successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating role.' });
    }
};

// --- 🛡️ HMAC-SHA256 SECURE QR ENGINE 🛡️ ---

exports.generateBulkBadges = async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 50;
        const secret = process.env.QR_SECRET || 'accesspro_secure_vault_2026';
        const badges = [];

        for (let i = 0; i < count; i++) {
            const id = crypto.randomBytes(4).toString('hex').toUpperCase();
            const signature = crypto.createHmac('sha256', secret)
                                    .update(id)
                                    .digest('hex')
                                    .substring(0, 8).toUpperCase();
            
            badges.push(`${id}-${signature}`);
        }

        res.status(200).json({ 
            message: `Successfully generated ${count} secure badges.`,
            badges 
        });
    } catch (error) {
        console.error('Badge Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate secure badges.' });
    }
};

exports.pairBadge = async (req, res) => {
    try {
        const { participantId, qrString } = req.body;
        const secret = process.env.QR_SECRET || 'accesspro_secure_vault_2026';

        if (!qrString || !qrString.includes('-')) {
            return res.status(400).json({ message: 'Invalid badge format.' });
        }

        const [id, signature] = qrString.split('-');
        const expectedSignature = crypto.createHmac('sha256', secret)
                                        .update(id)
                                        .digest('hex')
                                        .substring(0, 8).toUpperCase();

        if (signature !== expectedSignature) {
            return res.status(403).json({ message: 'COUNTERFEIT DETECTED: Badge signature is invalid.' });
        }

        const existingUser = await Participant.findOne({ qrId: qrString });
        if (existingUser) {
            return res.status(409).json({ message: `Badge already assigned to ${existingUser.name}.` });
        }

        const participant = await Participant.findById(participantId);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found.' });
        }

        participant.qrId = qrString;
        await participant.save();

        res.status(200).json({ 
            message: `Successfully paired badge to ${participant.name}.`,
            participant
        });

    } catch (error) {
        console.error('Pairing Error:', error);
        res.status(500).json({ message: 'Server error during pairing process.' });
    }
};

// --- 👑 GOD MODE CONTROLS ---

exports.updateParticipant = async (req, res) => {
    try {
        const updatedUser = await Participant.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } 
        );
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'Participant not found.' });
        }
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Update Participant Error:', error);
        res.status(500).json({ message: 'Error updating participant.' });
    }
};

exports.deleteParticipant = async (req, res) => {
    try {
        const deletedUser = await Participant.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            return res.status(404).json({ message: 'Participant not found.' });
        }
        
        res.status(200).json({ message: 'Participant deleted successfully.' });
    } catch (error) {
        console.error('Delete Participant Error:', error);
        res.status(500).json({ message: 'Error deleting participant.' });
    }
};

// --- 🚨 SYSTEM PURGE (NEW) ---

exports.purgeDatabase = async (req, res) => {
    try {
        await Participant.deleteMany({});
        await Scan.deleteMany({});
        res.status(200).json({ message: 'SYSTEM PURGED: All data has been permanently deleted.' });
    } catch (error) {
        console.error('Purge Error:', error);
        res.status(500).json({ message: 'Critical error during system purge.' });
    }
};