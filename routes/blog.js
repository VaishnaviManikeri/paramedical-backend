const express = require('express');
const Blog = require('../models/Blog');
const upload = require('../middleware/upload');

const router = express.Router();

/* CREATE BLOG */
router.post('/', upload.single('image'), async (req, res, next) => {
    try {
        const blog = new Blog({
            title: req.body.title,
            content: req.body.content,
            status: req.body.status,
            image: req.file ? req.file.filename : null
        });
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        next(err);
    }
});

/* GET PUBLIC BLOGS */
router.get('/', async (req, res, next) => {
    try {
        const blogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        next(err);
    }
});

/* GET ADMIN BLOGS */
router.get('/all', async (req, res, next) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        next(err);
    }
});

/* UPDATE BLOG */
router.put('/:id', upload.single('image'), async (req, res, next) => {
    try {
        const updateData = {
            title: req.body.title,
            content: req.body.content,
            status: req.body.status
        };

        if (req.file) updateData.image = req.file.filename;

        const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(blog);
    } catch (err) {
        next(err);
    }
});

/* DELETE BLOG */
router.delete('/:id', async (req, res, next) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
