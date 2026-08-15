const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, default: '', maxlength: 2000 },
  videoUrl: { type: String, required: true, trim: true },
  sourceType: { type: String, enum: ['upload', 'link'], required: true },
  cloudinaryId: { type: String, default: null },
  thumbnailUrl: { type: String, default: '' },
  originalName: { type: String, default: '' },
  mimeType: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
