const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/Blog');

/* =========================================================
   ENSURE UPLOAD DIRECTORY EXISTS (VERY IMPORTANT FOR RENDER)
========================================================= */
const uploadDir = path.join(__dirname, '../uploads/blogs');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================================================
   MULTER CONFIG
========================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

/* =========================================================
   CREATE BLOG (POST /api/blogs)
========================================================= */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    // ✅ Validation
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
        ? tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [],
      image: req.file ? `/uploads/blogs/${req.file.filename}` : null
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog
    });
  } catch (error) {
    console.error('BLOG CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
});

/* =========================================================
   GET ALL BLOGS (PUBLIC)
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
   GET SINGLE BLOG
========================================================= */
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

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
        ? tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []
    };

    if (req.file) {
      updateData.image = `/uploads/blogs/${req.file.filename}`;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      blog: updatedBlog
    });
  } catch (error) {
    console.error('BLOG UPDATE ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

/* =========================================================
   DELETE BLOG
========================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes("image")) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
});

module.exports = router;
