const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/Blog');

/* =========================================================
   ENSURE UPLOAD DIRECTORY EXISTS
========================================================= */
const uploadDir = path.join(__dirname, '../uploads/blogs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================================================
   MULTER CONFIG
========================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

/* =========================================================
   CREATE BLOG
========================================================= */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    if (!title || !author || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, Author and Content are required'
      });
    }

    const blog = new Blog({
      title: title.trim(),
      author: author.trim(),
      content,
      tags: tags
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      image: req.file ? `/uploads/blogs/${req.file.filename}` : null
      // ✅ slug auto-generated in model
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog
    });
  } catch (error) {
    console.error('BLOG CREATE ERROR:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate blog detected'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   GET ALL BLOGS
========================================================= */
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================================================
   GET BLOG BY SLUG
========================================================= */
router.get('/slug/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================================================
   UPDATE BLOG
========================================================= */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    const updateData = {
      title,
      author,
      content,
      tags: tags
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
    };

    if (req.file) {
      updateData.image = `/uploads/blogs/${req.file.filename}`;
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    });

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================================================
   DELETE BLOG
========================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
