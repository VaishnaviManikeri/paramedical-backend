const Blog = require('../models/Blog');

// ================= CREATE BLOG =================
exports.createBlog = async (req, res, next) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, blog });
  } catch (err) {
    next(err);
  }
};

// ================= GET ALL (PUBLIC) =================
exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    next(err);
  }
};

// ================= GET ALL (ADMIN) =================
exports.getAllBlogsAdmin = async (req, res, next) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    next(err);
  }
};

// ================= GET BY ID =================
exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json({ success: true, blog });
  } catch (err) {
    next(err);
  }
};

// ================= UPDATE =================
exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.json({ success: true, blog });
  } catch (err) {
    next(err);
  }
};

// ================= DELETE =================
exports.deleteBlog = async (req, res, next) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    next(err);
  }
};
