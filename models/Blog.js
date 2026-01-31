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
      type: String, // image URL
      required: true
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    }
  },
  { timestamps: true } // 👉 createdAt & updatedAt
);

/* AUTO SLUG */
blogSchema.pre('validate', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('Blog', blogSchema);
