const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    
    // For uploaded files
    mediaUrl: { type: String, required: true },
    cloudinaryId: { type: String }, // for images only
    
    // For external URLs
    externalUrl: { type: String },
    
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
    },
    
    uploadType: {
        type: String,
        enum: ['upload', 'url'],
        default: 'upload'
    },
    
    category: {
        type: String,
        enum: ['events', 'activities', 'general'],
        default: 'general'
    }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);