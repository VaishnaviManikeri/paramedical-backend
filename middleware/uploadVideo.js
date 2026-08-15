const multer = require('multer');

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    // Some browsers send uncommon video formats as application/octet-stream.
    const looksLikeVideo = file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/octet-stream';

    if (!looksLikeVideo) {
      return callback(new Error('Please upload a valid video file.'));
    }

    callback(null, true);
  }
  // Deliberately no Multer fileSize limit. The deployment/Cloudinary plan remains
  // the ultimate upload limit.
});

module.exports = uploadVideo;
