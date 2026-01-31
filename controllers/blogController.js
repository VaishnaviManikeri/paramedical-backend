const Blog = require('../models/Blog');

/* CREATE BLOG */
exports.createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, status } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const blog = await Blog.create({
      title,
      excerpt,
      content,
      status,
      image: `/uploads/blogs/${req.file.filename}`
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* GET ALL (PUBLIC) */
exports.getBlogs = async (req, res) => {
  const blogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
  res.json(blogs);
};

/* GET ALL (ADMIN) */
exports.getBlogsAdmin = async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
};

/* GET BY ID */
exports.getBlogById = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Not found' });
  res.json(blog);
};

/* UPDATE BLOG */
exports.updateBlog = async (req, res) => {
  const data = { ...req.body };

  if (req.file) {
    data.image = `/uploads/blogs/${req.file.filename}`;
  }

  const blog = await Blog.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json(blog);
};

/* DELETE BLOG */
exports.deleteBlog = async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: 'Blog deleted' });
};
