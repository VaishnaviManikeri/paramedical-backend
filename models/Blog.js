const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true 
    },
    slug: { 
        type: String, 
        required: true,
        unique: true,
        lowercase: true 
    },
    excerpt: { 
        type: String, 
        required: true,
        maxlength: 200 
    },
    content: { 
        type: String, 
        required: true 
    },
    featuredImage: { 
        type: String, 
        required: true 
    },
    cloudinaryId: { 
        type: String 
    },
    author: {
        name: { type: String, default: 'Admin' },
        avatar: { type: String }
    },
    category: {
        type: String,
        enum: ['news', 'events', 'academic', 'research', 'student-life', 'alumni', 'general'],
        default: 'general'
    },
    tags: [{ 
        type: String,
        lowercase: true,
        trim: true 
    }],
    readTime: { 
        type: Number, 
        default: 3 
    }, // in minutes
    views: { 
        type: Number, 
        default: 0 
    },
    isPublished: { 
        type: Boolean, 
        default: true 
    },
    isFeatured: { 
        type: Boolean, 
        default: false 
    },
    publishedAt: { 
        type: Date, 
        default: Date.now 
    },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
}, { 
    timestamps: true 
});

// Create slug from title before saving
BlogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }
    next();
});

module.exports = mongoose.model('Blog', BlogSchema);