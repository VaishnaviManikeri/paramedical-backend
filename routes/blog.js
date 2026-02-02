const express = require('express');
const router = express.Router();
const controller = require('../controllers/blogController');
const upload = require('../middleware/uploadMiddleware');

router.get('/', controller.getBlogs);        // public
router.get('/all', controller.getBlogsAdmin); // admin
router.get('/:id', controller.getBlogById);
router.post('/', upload.single('image'), controller.createBlog);
router.put('/:id', upload.single('image'), controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

module.exports = router;