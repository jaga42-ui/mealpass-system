const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'volunteer', 'pending'], 
        default: 'pending' 
    },
    scansPerformed: { 
        type: Number, 
        default: 0 
    },
    isDisabled: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);