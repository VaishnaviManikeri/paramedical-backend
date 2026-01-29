const mongoose = require('mongoose');

const CareerSchema = new mongoose.Schema({
    position: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    location: {
        type: String,
        required: true
    },
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        default: 'full-time'
    },
    salaryRange: {
        min: Number,
        max: Number
    },
    applicationDeadline: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Career', CareerSchema);