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
      unique: true
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

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },

    publishedDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

/* ================= AUTO SLUG GENERATOR (FIXED) ================= */
blogSchema.pre('validate', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')   // replace special chars
      .replace(/(^-|-$)/g, '');     // trim hyphens
  }
});

module.exports = mongoose.model('Blog', blogSchema);