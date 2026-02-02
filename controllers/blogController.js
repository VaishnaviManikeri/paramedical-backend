const Blog = require('../models/Blog');
const path = require('path');
const fs = require('fs');

/* ================= CREATE BLOG ================= */
exports.createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, status } = req.body;
    let image = '';

    // Handle image upload
    if (req.file) {
      image = `/uploads/blogs/${req.file.filename}`;
    }

    if (!title || !excerpt || !content) {
      return res.status(400).json({
        message: 'Title, excerpt and content are required'
      });
    }

    const blog = await Blog.create({
      title,
      excerpt,
      content,
      image,
      status,
      publishedDate: new Date()
    });

    res.status(201).json(blog);

  } catch (err) {
    console.error('CREATE BLOG ERROR:', err);
    res.status(400).json({ message: err.message });
  }
};

/* ================= GET ALL (PUBLIC) ================= */
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedDate: -1, createdAt: -1 });

    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET ALL (ADMIN) ================= */
exports.getBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ publishedDate: -1, createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET BLOG BY ID ================= */
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= UPDATE BLOG ================= */
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const updateData = { ...req.body };

    // Handle new image upload
    if (req.file) {
      // Delete old image if exists
      if (blog.image) {
        const oldImagePath = path.join(__dirname, '..', 'public', blog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/blogs/${req.file.filename}`;
    }

    // If publishedDate is being updated
    if (req.body.publishedDate) {
      updateData.publishedDate = new Date(req.body.publishedDate);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedBlog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= DELETE BLOG ================= */
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete associated image
    if (blog.image) {
      const imagePath = path.join(__dirname, '..', 'public', blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};