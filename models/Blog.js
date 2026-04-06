const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    excerpt: {
      type: String,
      required: true
    },

    content: {
      type: String,
      required: true
    },

    image: {
      type: String,
      default: ''
    },

    author: {
      type: String,
      default: 'Admin'
    },

    readingTime: {
      type: Number,
      default: 5
    },

    metaTitle: {
      type: String,
      trim: true
    },

    metaDescription: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },

    publishedDate: {
      type: Date,
      default: Date.now
    },

    views: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Auto-generate slug from title
blogSchema.pre('validate', function() {
  if (!this.slug && this.title) {
    let slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Add random suffix if slug is empty
    if (!slug) slug = `blog-${Date.now()}`;
    this.slug = slug;
  }
});

// Auto-generate meta title
blogSchema.pre('save', function() {
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title;
  }
  if (!this.metaDescription && this.excerpt) {
    this.metaDescription = this.excerpt.substring(0, 160);
  }
});

// Calculate reading time based on content length
blogSchema.pre('save', function() {
  if (this.content) {
    const wordsPerMinute = 200;
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    this.readingTime = Math.max(3, Math.ceil(wordCount / wordsPerMinute));
  }
});

module.exports = mongoose.model('Blog', blogSchema);
