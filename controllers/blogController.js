const Blog = require('../models/Blog');

// ================= CREATE =================
exports.createBlog = async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ================= GET ALL (PUBLIC) =================
exports.getBlogs = async (req, res) => {
  const blogs = await Blog.find({ status: 'published' })
    .sort({ createdAt: -1 });
  res.json(blogs);
};

// ================= GET ALL (ADMIN) =================
exports.getBlogsAdmin = async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
};

// ================= GET ONE =================
exports.getBlogById = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Blog not found' });
  res.json(blog);
};

// ================= UPDATE =================
exports.updateBlog = async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(blog);
};

// ================= DELETE =================
exports.deleteBlog = async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: 'Blog deleted successfully' });
};
