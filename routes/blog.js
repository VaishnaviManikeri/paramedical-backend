const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const upload = require('../middleware/upload');

/* ================= PUBLIC ================= */
router.get('/', async (req, res, next) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const blog = await Blog.findById(req.params.id);
        res.json(blog);
    } catch (err) {
        next(err);
    }
});

/* ================= ADMIN ================= */
router.post('/', upload.single('image'), async (req, res, next) => {
    try {
        const blog = new Blog({
            ...req.body,
            image: req.file ? req.file.path : ''
        });
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', upload.single('image'), async (req, res, next) => {
    try {
        const updated = await Blog.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                ...(req.file && { image: req.file.path })
            },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
