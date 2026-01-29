const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { adminAuth, auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// PUBLIC – GET ALL PUBLISHED BLOGS
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 9, 
            category, 
            tag, 
            featured, 
            search 
        } = req.query;
        
        const query = { isPublished: true };
        
        if (category) query.category = category;
        if (tag) query.tags = { $in: [tag] };
        if (featured === 'true') query.isFeatured = true;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        
        const blogs = await Blog.find(query)
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-content -metaTitle -metaDescription -metaKeywords');
        
        const total = await Blog.countDocuments(query);
        
        res.json({
            blogs,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC – GET SINGLE BLOG BY SLUG
router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ 
            slug: req.params.slug,
            isPublished: true 
        });
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        // Increment views
        blog.views += 1;
        await blog.save();
        
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC – GET RECENT BLOGS (with default limit)
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;
        const blogs = await Blog.find({ isPublished: true })
            .sort({ publishedAt: -1 })
            .limit(limit)
            .select('title slug excerpt featuredImage category publishedAt readTime');
        
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC – GET RECENT BLOGS WITH SPECIFIC LIMIT
router.get('/recent/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 4;
        const blogs = await Blog.find({ isPublished: true })
            .sort({ publishedAt: -1 })
            .limit(limit)
            .select('title slug excerpt featuredImage category publishedAt readTime');
        
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC – GET CATEGORIES
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { isPublished: true });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC – GET TAGS
router.get('/tags/list', async (req, res) => {
    try {
        const tags = await Blog.aggregate([
            { $match: { isPublished: true } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
        res.json(tags);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – GET ALL BLOGS (INCLUDING UNPUBLISHED)
router.get('/all', adminAuth, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – CREATE BLOG
router.post('/', adminAuth, upload.single('featuredImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Featured image is required' });
        }

        const { 
            title, excerpt, content, category, tags, 
            readTime, isPublished, isFeatured, 
            metaTitle, metaDescription, metaKeywords 
        } = req.body;

        // Process tags
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

        // Upload image to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'blogs' },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ message: error.message });
                }

                try {
                    const blog = new Blog({
                        title,
                        excerpt,
                        content,
                        category: category || 'general',
                        tags: tagsArray,
                        readTime: readTime || 3,
                        isPublished: isPublished === 'true',
                        isFeatured: isFeatured === 'true',
                        featuredImage: result.secure_url,
                        cloudinaryId: result.public_id,
                        metaTitle,
                        metaDescription,
                        metaKeywords: metaKeywords ? metaKeywords.split(',').map(kw => kw.trim()) : [],
                        publishedAt: new Date()
                    });

                    const savedBlog = await blog.save();
                    res.status(201).json(savedBlog);
                } catch (saveError) {
                    // Cleanup uploaded image if save fails
                    await cloudinary.uploader.destroy(result.public_id);
                    res.status(500).json({ message: saveError.message });
                }
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (err) {
        console.error('Create blog error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – UPDATE BLOG
router.put('/:id', adminAuth, upload.single('featuredImage'), async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const { 
            title, excerpt, content, category, tags, 
            readTime, isPublished, isFeatured,
            metaTitle, metaDescription, metaKeywords 
        } = req.body;

        // Process tags
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

        // Update blog fields
        blog.title = title || blog.title;
        blog.excerpt = excerpt || blog.excerpt;
        blog.content = content || blog.content;
        blog.category = category || blog.category;
        blog.tags = tagsArray;
        blog.readTime = readTime || blog.readTime;
        blog.isPublished = isPublished === 'true';
        blog.isFeatured = isFeatured === 'true';
        blog.metaTitle = metaTitle;
        blog.metaDescription = metaDescription;
        blog.metaKeywords = metaKeywords ? metaKeywords.split(',').map(kw => kw.trim()) : [];

        // If new image uploaded
        if (req.file) {
            // Delete old image from Cloudinary
            if (blog.cloudinaryId) {
                await cloudinary.uploader.destroy(blog.cloudinaryId);
            }

            // Upload new image
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'blogs' },
                async (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return res.status(500).json({ message: error.message });
                    }

                    blog.featuredImage = result.secure_url;
                    blog.cloudinaryId = result.public_id;

                    try {
                        const updatedBlog = await blog.save();
                        res.json(updatedBlog);
                    } catch (saveError) {
                        // Cleanup uploaded image if save fails
                        await cloudinary.uploader.destroy(result.public_id);
                        res.status(500).json({ message: saveError.message });
                    }
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } else {
            // No new image, just save the updates
            const updatedBlog = await blog.save();
            res.json(updatedBlog);
        }
    } catch (err) {
        console.error('Update blog error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – DELETE BLOG
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Delete image from Cloudinary
        if (blog.cloudinaryId) {
            await cloudinary.uploader.destroy(blog.cloudinaryId);
        }

        await blog.deleteOne();
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;