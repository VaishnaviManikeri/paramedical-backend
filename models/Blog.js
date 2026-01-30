const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    image: {
      type: String // image URL
    }
  },
  { timestamps: true } // ✅ createdAt & updatedAt
);

module.exports = mongoose.model('Blog', BlogSchema);
