const express = require('express');
const router = express.Router();
const controller = require('../controllers/blogController');
const upload = require('../middleware/uploadMiddleware');

router.get('/', controller.getBlogs);              // public - all blogs
router.get('/admin/all', controller.getBlogsAdmin); // admin - all blogs
router.get('/slug/:slug', controller.getBlogBySlug); // public - by slug
router.get('/:id', controller.getBlogById);        // admin - by id
router.post('/', upload.single('image'), controller.createBlog);
router.put('/:id', upload.single('image'), controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;
