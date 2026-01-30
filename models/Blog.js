const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        minlength: [50, 'Content should be at least 50 characters']
    },
    author: {
        type: String,
        default: 'Admin',
        trim: true
    },
    image: {
        type: String // base64 image
    },
    tags: {
        type: [String],
        default: []
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    excerpt: {
        type: String,
        maxlength: [300, 'Excerpt cannot exceed 300 characters']
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

// Update updatedAt on save
blogSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.substring(0, 200) + '...';
    }
    next();
});

module.exports = mongoose.model('Blog', blogSchema);