const express = require('express');
const router = express.Router();
const controller = require('../controllers/blogController');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', controller.getBlogs);                    // Get all published blogs
router.get('/slug/:slug', controller.getBlogBySlug);    // Get blog by slug (for public view)

// Admin routes
router.get('/admin/all', controller.getBlogsAdmin);     // Get all blogs (including drafts)
router.get('/:id', controller.getBlogById);             // Get blog by ID (for admin edit)

// Write routes
router.post('/', upload.single('image'), controller.createBlog);
router.put('/:id', upload.single('image'), controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;
