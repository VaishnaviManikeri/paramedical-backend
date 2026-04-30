const multer = require('multer');

const storage = multer.memoryStorage();

// Allow both images and videos
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
        // Videos
        'video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/mkv', 'video/mpeg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Allowed types: images and videos (${allowedTypes.join(', ')})`), false);
    }
};

const upload = multer({
    storage,
    limits: { 
        fileSize: 100 * 1024 * 1024 // 100MB max for videos
    },
    fileFilter
});

module.exports = upload;
