const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Blog = require('../models/Blog');

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/blogs');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ================= CREATE BLOG =================
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    const blog = new Blog({
      title,
      author,
      content,
      tags: tags ? tags.split(',') : [],
      image: req.file ? `/uploads/blogs/${req.file.filename}` : null
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= GET ALL BLOGS (PUBLIC) =================
router.get('/', async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
});

// ================= GET SINGLE BLOG =================
router.get('/:id', async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Blog not found' });
  res.json(blog);
});

// ================= UPDATE BLOG =================
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      tags: req.body.tags ? req.body.tags.split(',') : []
    };

    if (req.file) {
      updateData.image = `/uploads/blogs/${req.file.filename}`;
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    });

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
