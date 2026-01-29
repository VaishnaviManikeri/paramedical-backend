const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,

    imageUrl: { type: String, required: true },
    cloudinaryId: { type: String }, // for delete/update

    category: {
        type: String,
        enum: ['events', 'activities', 'general'],
        default: 'general'
    }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);
