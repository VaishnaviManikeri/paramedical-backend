const express = require('express');
const router = express.Router();
const blogCtrl = require('../controllers/blogController');

// PUBLIC
router.get('/', blogCtrl.getBlogs);
router.get('/:id', blogCtrl.getBlogById);

// ADMIN
router.get('/admin/all', blogCtrl.getAllBlogsAdmin);
router.post('/', blogCtrl.createBlog);
router.put('/:id', blogCtrl.updateBlog);
router.delete('/:id', blogCtrl.deleteBlog);

module.exports = router;
