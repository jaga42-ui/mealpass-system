const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    qrId: { 
        type: String, 
        unique: true, 
        sparse: true 
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
        default: '' 
    },
    totpSecret: {
        type: String
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    isApproved: { 
        type: Boolean,
        default: true
    },
    // 🚀 THE MAGIC BUCKET: This will hold ANY extra columns from your Excel file!
    metadata: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);