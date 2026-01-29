const express = require('express');
const router = express.Router();
const {
    createBlog,
    getBlogs,
    getBlogsAdmin,
    getBlogById,
    updateBlog,
    deleteBlog
} = require('../controllers/blogController');

// PUBLIC
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// ADMIN
router.get('/admin/all', getBlogsAdmin);
router.post('/', createBlog);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

module.exports = router;
