const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    excerpt: {
        type: String,
        maxlength: 200
    },
    featuredImage: {
        type: String,
        default: ''
    },
    author: {
        type: String,
        default: 'Admin'
    },
    category: {
        type: String,
        default: 'General'
    },
    tags: [{
        type: String
    }],
    isPublished: {
        type: Boolean,
        default: true
    },
    views: {
        type: Number,
        default: 0
    },
    metaTitle: {
        type: String
    },
    metaDescription: {
        type: String
    },
    seoKeywords: [{
        type: String
    }]
}, {
    timestamps: true
});

// Generate slug before saving
BlogSchema.pre('save', function(next) {
    if (this.title && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    
    if (this.content && !this.excerpt) {
        this.excerpt = this.content.substring(0, 200) + '...';
    }
    
    next();
});

module.exports = mongoose.model('Blog', BlogSchema);