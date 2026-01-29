const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// PUBLIC – GET ALL
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – CREATE
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'gallery' },
            async (error, result) => {
                if (error) return res.status(500).json({ message: error.message });

                const galleryItem = new Gallery({
                    title: req.body.title,
                    description: req.body.description,
                    category: req.body.category,
                    imageUrl: result.secure_url,
                    cloudinaryId: result.public_id
                });

                const saved = await galleryItem.save();
                res.status(201).json(saved);
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – UPDATE
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        if (req.file) {
            if (item.cloudinaryId) {
                await cloudinary.uploader.destroy(item.cloudinaryId);
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'gallery' },
                async (error, result) => {
                    if (error) return res.status(500).json({ message: error.message });

                    item.imageUrl = result.secure_url;
                    item.cloudinaryId = result.public_id;
                    Object.assign(item, req.body);

                    const updated = await item.save();
                    res.json(updated);
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } else {
            Object.assign(item, req.body);
            const updated = await item.save();
            res.json(updated);
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – DELETE
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        if (item.cloudinaryId) {
            await cloudinary.uploader.destroy(item.cloudinaryId);
        }

        await item.deleteOne();
        res.json({ message: 'Deleted successfully' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
