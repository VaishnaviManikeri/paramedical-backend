const express = require('express');
const router = express.Router();
const controller = require('../controllers/blogController');

router.get('/', controller.getBlogs);        // public
router.get('/all', controller.getBlogsAdmin); // admin
router.get('/:id', controller.getBlogById);
router.post('/', controller.createBlog);
router.put('/:id', controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;
