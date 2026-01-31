const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadBlog');
const controller = require('../controllers/blogController');

router.get('/', controller.getBlogs);
router.get('/all', controller.getBlogsAdmin);
router.get('/:id', controller.getBlogById);

router.post('/', upload.single('image'), controller.createBlog);
router.put('/:id', upload.single('image'), controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;
