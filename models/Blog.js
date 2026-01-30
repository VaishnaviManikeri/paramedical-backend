const mongoose = require('mongoose');
const slugify = require('slugify');

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    author: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    image: {
      type: String
    }
  },
  { timestamps: true }
);

/* =====================================================
   AUTO-GENERATE UNIQUE SLUG FROM TITLE
   FIXED: Proper error handling in middleware
===================================================== */
BlogSchema.pre('save', function (next) {
  try {
    // Only generate slug if it doesn't exist
    if (!this.slug || this.isModified('title')) {
      // Generate base slug
      let baseSlug = slugify(this.title, { 
        lower: true, 
        strict: true,
        remove: /[*+~.()'"!:@]/g 
      });
      
      // Add timestamp for uniqueness
      this.slug = `${baseSlug}-${Date.now()}`;
    }
    next();
  } catch (error) {
    console.error('Slug generation error:', error);
    // If slugify fails, use a fallback
    this.slug = `blog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  }
});

/* =====================================================
   Alternative: Generate slug on create only
===================================================== */
BlogSchema.pre('save', function (next) {
  // Only generate slug on new documents
  if (this.isNew && !this.slug) {
    try {
      const baseSlug = slugify(this.title, { 
        lower: true, 
        strict: true 
      });
      this.slug = `${baseSlug}-${Date.now()}`;
    } catch (err) {
      this.slug = `post-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Blog', BlogSchema);