const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

/* ================= PUBLIC ================= */

// Get all blogs
router.get('/', async (req, res, next) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        next(err);
    }
});

// Get single blog
router.get('/:id', async (req, res, next) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (err) {
        next(err);
    }
});

/* ================= ADMIN ================= */

// Create blog
router.post('/', async (req, res, next) => {
    try {
        const blog = new Blog(req.body);
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        next(err);
    }
});

// Update blog
router.put('/:id', async (req, res, next) => {
    try {
        const updated = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Delete blog
router.delete('/:id', async (req, res, next) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
