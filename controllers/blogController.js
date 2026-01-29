const Blog = require('../models/Blog');

// ================= CREATE BLOG =================
exports.createBlog = async (req, res, next) => {
    try {
        const blog = await Blog.create(req.body);
        res.status(201).json(blog);
    } catch (error) {
        next(error);
    }
};

// ================= GET ALL BLOGS (PUBLIC) =================
exports.getBlogs = async (req, res, next) => {
    try {
        const blogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        next(error);
    }
};

// ================= GET ALL BLOGS (ADMIN) =================
exports.getBlogsAdmin = async (req, res, next) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        next(error);
    }
};

// ================= GET BLOG BY ID =================
exports.getBlogById = async (req, res, next) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (error) {
        next(error);
    }
};

// ================= UPDATE BLOG =================
exports.updateBlog = async (req, res, next) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(blog);
    } catch (error) {
        next(error);
    }
};

// ================= DELETE BLOG =================
exports.deleteBlog = async (req, res, next) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        next(error);
    }
};
