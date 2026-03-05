const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
    participantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Participant',
        required: true 
    },
    mealType: { 
        type: String, 
        enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
        required: true 
    },
    scanDate: { 
        type: String, 
        required: true // Format: YYYY-MM-DD
    },
    scannedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    }
}, { timestamps: true });

// This compound index is our first line of defense against double-dipping. 
// It guarantees a participant can only have ONE record per mealType per day.
scanSchema.index({ participantId: 1, mealType: 1, scanDate: 1 }, { unique: true });

module.exports = mongoose.model('Scan', scanSchema);