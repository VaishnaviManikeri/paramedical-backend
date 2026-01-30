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
===================================================== */
BlogSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug =
      slugify(this.title, { lower: true, strict: true }) +
      '-' +
      Date.now();
  }
  next();
});

module.exports = mongoose.model('Blog', BlogSchema);
