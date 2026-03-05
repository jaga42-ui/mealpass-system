const Participant = require('../models/Participant');
const speakeasy = require('speakeasy');

// @desc    Add a new participant (Generates their secure TOTP secret)
// @route   POST /api/participants
// @access  Private (Admin Only)
exports.addParticipant = async (req, res) => {
    try {
        const { qrId, name, category, department, photoUrl } = req.body;

        if (!qrId || !name || !category) {
            return res.status(400).json({ message: 'Please provide qrId, name, and category.' });
        }

        const existingParticipant = await Participant.findOne({ qrId });
        if (existingParticipant) {
            return res.status(400).json({ message: 'Participant with this ID already exists.' });
        }

        // 3. GENERATE THE VAULT KEY WITH SPEAKEASY
        const secret = speakeasy.generateSecret({ length: 20 });
        const secretKey = secret.base32;

        const participant = await Participant.create({
            qrId,
            name,
            category,
            department: department || 'N/A',
            photoUrl: photoUrl || '',
            totpSecret: secretKey 
        });

        res.status(201).json({
            message: 'Participant added successfully.',
            participant: {
                qrId: participant.qrId,
                name: participant.name,
                secret: participant.totpSecret 
            }
        });

    } catch (error) {
        console.error('Error adding participant:', error);
        res.status(500).json({ message: 'Server error while adding participant.' });
    }
};

exports.getParticipants = async (req, res) => {
    try {
        const participants = await Participant.find({ isActive: true }).select('-totpSecret');
        res.status(200).json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ message: 'Server error fetching participants.' });
    }
};
// @desc    Participant Login (Fetches their secret key for the web portal)
// @route   POST /api/participants/login
// @access  Public
exports.loginParticipant = async (req, res) => {
    try {
        const { qrId } = req.body;

        if (!qrId) {
            return res.status(400).json({ message: 'Please provide your Event ID.' });
        }

        // Find the participant (case-insensitive search)
        const participant = await Participant.findOne({ 
            qrId: { $regex: new RegExp(`^${qrId}$`, 'i') }, 
            isActive: true 
        });

        if (!participant) {
            return res.status(404).json({ message: 'Invalid ID or inactive account.' });
        }

        // Send back the data needed to generate the dynamic QR code on their device
        res.status(200).json({
            message: 'Login successful',
            participant: {
                qrId: participant.qrId,
                name: participant.name,
                category: participant.category,
                secret: participant.totpSecret
            }
        });

    } catch (error) {
        console.error('Participant Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};