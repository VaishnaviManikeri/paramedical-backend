const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10 // Maximum 10 files at once
    },
    fileFilter
});

// Export both default and named
module.exports = upload; // Default export

// Also export named functions for flexibility
module.exports.singleUpload = upload.single('image');
module.exports.multiUpload = upload.array('images', 10);
module.exports.singleMiddleware = upload.single('image');
module.exports.multiMiddleware = upload.array('images', 10);