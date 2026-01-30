const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const upload = require('../middleware/upload');

// ================= CREATE SINGLE BLOG =================
router.post('/', upload.singleUpload, async (req, res) => {
    try {
        const { title, content, author, tags, excerpt } = req.body;
        
        const blog = new Blog({
            title,
            content,
            author: author || 'Admin',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            excerpt,
            image: req.file
                ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
                : null
        });

        await blog.save();
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: blog
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= CREATE MULTIPLE BLOGS =================
router.post('/bulk', upload.multiUpload, async (req, res) => {
    try {
        const blogsData = req.body.blogs;
        
        if (!blogsData || !Array.isArray(blogsData)) {
            return res.status(400).json({
                success: false,
                message: 'Blogs data is required as an array'
            });
        }

        // Process images if uploaded
        const images = req.files || [];
        
        const blogsToCreate = blogsData.map((blogData, index) => {
            const blog = {
                title: blogData.title,
                content: blogData.content,
                author: blogData.author || 'Admin',
                tags: blogData.tags ? blogData.tags.split(',').map(tag => tag.trim()) : [],
                excerpt: blogData.excerpt || blogData.content.substring(0, 200) + '...'
            };

            // Assign image if available
            if (images[index]) {
                blog.image = `data:${images[index].mimetype};base64,${images[index].buffer.toString('base64')}`;
            }

            return blog;
        });

        const createdBlogs = await Blog.insertMany(blogsToCreate);
        
        res.status(201).json({
            success: true,
            message: `${createdBlogs.length} blogs created successfully`,
            data: createdBlogs
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= GET ALL BLOGS (PUBLIC) =================
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '',
            tag = '',
            author = '' 
        } = req.query;

        const query = { isPublished: true };
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (tag) {
            query.tags = { $in: [tag] };
        }
        
        if (author) {
            query.author = { $regex: author, $options: 'i' };
        }

        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Blog.countDocuments(query);

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
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= GET ALL BLOGS (ADMIN) =================
router.get('/admin/all', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= GET SINGLE BLOG =================
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
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= UPDATE BLOG =================
router.put('/:id', upload.singleUpload, async (req, res) => {
    try {
        const updateData = {
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            excerpt: req.body.excerpt,
            isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true
        };

        if (req.file) {
            updateData.image = 
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.json({
            success: true,
            message: 'Blog updated successfully',
            data: blog
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= DELETE BLOG =================
router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        res.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ================= BULK DELETE BLOGS =================
router.delete('/', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: 'Blog IDs array is required'
            });
        }

        const result = await Blog.deleteMany({ _id: { $in: ids } });
        
        res.json({
            success: true,
            message: `${result.deletedCount} blogs deleted successfully`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

module.exports = router;