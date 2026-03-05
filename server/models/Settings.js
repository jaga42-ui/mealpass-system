const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    activeMeal: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
        default: 'Lunch'
    },
    isScannerLocked: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Settings', settingsSchema);