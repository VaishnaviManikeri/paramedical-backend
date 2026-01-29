const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/blogs/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// @route   GET /api/blogs
// @desc    Get all published blogs
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, tag, search } = req.query;
        
        let query = { isPublished: true };
        
        if (category) {
            query.category = category;
        }
        
        if (tag) {
            query.tags = { $in: [tag] };
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }
        
        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');
        
        const total = await Blog.countDocuments(query);
        
        res.json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/blogs/all
// @desc    Get all blogs (including unpublished - for admin)
// @access  Private
router.get('/all', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        console.error('Error fetching all blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/blogs/:slug
// @desc    Get single blog by slug
// @access  Public
router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        
        // Increment view count
        blog.views += 1;
        await blog.save();
        
        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/blogs/id/:id
// @desc    Get single blog by ID
// @access  Private
router.get('/id/:id', async (req, res) => {
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
        console.error('Error fetching blog by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/blogs
// @desc    Create a new blog
// @access  Private
router.post('/', upload.single('featuredImage'), async (req, res) => {
    try {
        const { title, content, category, tags, author, isPublished, metaTitle, metaDescription, seoKeywords } = req.body;
        
        const blogData = {
            title,
            content,
            category: category || 'General',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            author: author || 'Admin',
            isPublished: isPublished !== 'false',
            metaTitle,
            metaDescription
        };
        
        if (seoKeywords) {
            blogData.seoKeywords = seoKeywords.split(',').map(keyword => keyword.trim());
        }
        
        if (req.file) {
            blogData.featuredImage = `/uploads/blogs/${req.file.filename}`;
        }
        
        const blog = new Blog(blogData);
        await blog.save();
        
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: blog
        });
    } catch (error) {
        console.error('Error creating blog:', error);
        
        // Delete uploaded file if there was an error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating blog'
        });
    }
});

// @route   PUT /api/blogs/:id
// @desc    Update a blog
// @access  Private
router.put('/:id', upload.single('featuredImage'), async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        
        const { title, content, category, tags, author, isPublished, metaTitle, metaDescription, seoKeywords } = req.body;
        
        // Update fields
        if (title) blog.title = title;
        if (content) blog.content = content;
        if (category) blog.category = category;
        if (tags) blog.tags = tags.split(',').map(tag => tag.trim());
        if (author) blog.author = author;
        if (isPublished !== undefined) blog.isPublished = isPublished !== 'false';
        if (metaTitle) blog.metaTitle = metaTitle;
        if (metaDescription) blog.metaDescription = metaDescription;
        if (seoKeywords) blog.seoKeywords = seoKeywords.split(',').map(keyword => keyword.trim());
        
        // Handle featured image update
        if (req.file) {
            // Delete old image if exists
            if (blog.featuredImage && blog.featuredImage.startsWith('/uploads/')) {
                const oldImagePath = blog.featuredImage.substring(1);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error('Error deleting old image:', err);
                    });
                }
            }
            blog.featuredImage = `/uploads/blogs/${req.file.filename}`;
        }
        
        await blog.save();
        
        res.json({
            success: true,
            message: 'Blog updated successfully',
            data: blog
        });
    } catch (error) {
        console.error('Error updating blog:', error);
        
        // Delete uploaded file if there was an error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating blog'
        });
    }
});

// @route   DELETE /api/blogs/:id
// @desc    Delete a blog
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        
        // Delete featured image if exists
        if (blog.featuredImage && blog.featuredImage.startsWith('/uploads/')) {
            const imagePath = blog.featuredImage.substring(1);
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error('Error deleting image:', err);
                });
            }
        }
        
        await blog.deleteOne();
        
        res.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/blogs/categories/all
// @desc    Get all categories
// @access  Public
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { isPublished: true });
        res.json({
            success: true,
            data: categories.filter(cat => cat && cat.trim() !== '')
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/blogs/tags/all
// @desc    Get all tags
// @access  Public
router.get('/tags/all', async (req, res) => {
    try {
        const tags = await Blog.distinct('tags', { isPublished: true });
        const flattenedTags = [].concat(...tags).filter(tag => tag && tag.trim() !== '');
        const uniqueTags = [...new Set(flattenedTags)];
        
        res.json({
            success: true,
            data: uniqueTags
        });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;