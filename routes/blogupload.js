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
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed'));
    }
  }
});

/* =========================================================
   CREATE BLOG
========================================================= */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Author is required'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    // Parse tags
    const tagArray = tags
      ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];

    // Create blog
    const blogData = {
      title: title.trim(),
      author: author.trim(),
      content: content.trim(),
      tags: tagArray
    };

    // Add image if uploaded
    if (req.file) {
      blogData.image = `/uploads/blogs/${req.file.filename}`;
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog: blog
    });

  } catch (error) {
    console.error('BLOG CREATE ERROR:', error);

    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A blog with similar title already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* =========================================================
   GET ALL BLOGS (with optional pagination)
========================================================= */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments();

    res.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET BLOGS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs'
    });
  }
});

/* =========================================================
   GET BLOG BY SLUG
========================================================= */
router.get('/slug/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('GET BLOG BY SLUG ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog'
    });
  }
});

/* =========================================================
   GET BLOG BY ID
========================================================= */
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('GET BLOG BY ID ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog'
    });
  }
});

/* =========================================================
   UPDATE BLOG
========================================================= */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, author, content, tags } = req.body;

    // Find existing blog
    const existingBlog = await Blog.findById(req.params.id);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Update data
    const updateData = {
      title: title ? title.trim() : existingBlog.title,
      author: author ? author.trim() : existingBlog.author,
      content: content ? content.trim() : existingBlog.content,
      tags: tags
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : existingBlog.tags
    };

    // If title changed, slug will be regenerated in pre-save
    if (title && title.trim() !== existingBlog.title) {
      updateData.slug = null; // Will trigger new slug generation
    }

    // Handle image update
    if (req.file) {
      updateData.image = `/uploads/blogs/${req.file.filename}`;
      
      // Optional: Delete old image file
      if (existingBlog.image) {
        const oldImagePath = path.join(__dirname, '..', existingBlog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error('Error deleting old image:', err);
          });
        }
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('UPDATE BLOG ERROR:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate blog title detected'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update blog'
    });
  }
});

/* =========================================================
   DELETE BLOG
========================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete associated image file if exists
    if (blog.image) {
      const imagePath = path.join(__dirname, '..', blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Error deleting image file:', err);
        });
      }
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('DELETE BLOG ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog'
    });
  }
});

module.exports = router;