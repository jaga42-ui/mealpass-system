const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    qrId: { 
        type: String, 
        // required: true is REMOVED so they can be added without a badge
        unique: true, 
        sparse: true // 🚀 THE MAGIC KEY: Allows multiple people to have no badge without crashing
    },
    name: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    },
    department: { 
        type: String,
        default: 'N/A'
    },
    photoUrl: {
        type: String,
        default: '' // Optional: URL to their headshot for visual verification
    },
    totpSecret: {
        type: String
        // required: true is REMOVED so they can be added without a cryptographic key
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    isApproved: { // Added so the frontend toggle doesn't crash
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);