const express = require('express');
const router = express.Router();
const controller = require('../controllers/blogController');

router.get('/', controller.getBlogs);           // Public
router.get('/all', controller.getBlogsAdmin);   // Admin
router.get('/:id', controller.getBlogById);
router.post('/', controller.createBlog);
router.put('/:id', controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;
