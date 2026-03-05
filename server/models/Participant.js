const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    qrId: { 
        type: String, 
        required: true, 
        unique: true 
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
        type: String,
        required: true // The cryptographic key for this specific person
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);