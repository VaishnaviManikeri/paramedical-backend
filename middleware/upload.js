const multer = require('multer');

// ================= MULTER STORAGE =================
// Memory storage is best for Cloudinary uploads
const storage = multer.memoryStorage();

// ================= FILE FILTER =================
const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (isImage || isVideo) {
        cb(null, true);
    } else {
        cb(
            new Error('Only image and video files are allowed (jpg, png, mp4, etc.)'),
            false
        );
    }
};

// ================= MULTER INSTANCE =================
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max (safe for videos)
    },
    fileFilter
});

module.exports = upload;
