const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const upload = require('../middleware/upload');

// ================= CREATE BLOG =================
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, content, author } = req.body;

        const blog = new Blog({
            title,
            content,
            author,
            image: req.file
                ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
                : null
        });

        await blog.save();
        res.status(201).json(blog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ================= GET ALL BLOGS (PUBLIC) =================
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ================= GET SINGLE BLOG =================
router.get('/:id', async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    res.json(blog);
});

// ================= UPDATE BLOG =================
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            title: req.body.title,
            content: req.body.content,
            author: req.body.author
        };

        if (req.file) {
            updateData.image =
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ================= DELETE BLOG =================
router.delete('/:id', async (req, res) => {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
});

module.exports = router;
