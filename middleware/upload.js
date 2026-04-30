const multer = require('multer');

const storage = multer.memoryStorage();

// Allow both images and videos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'), false);
    }
};

const upload = multer({
    storage,
    limits: { 
        fileSize: 50 * 1024 * 1024 // 50MB for videos
    },
    fileFilter
});

module.exports = upload;
