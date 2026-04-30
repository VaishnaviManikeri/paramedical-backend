const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Helper to check if Cloudinary URL is video
const isVideoUrl = (url) => {
    return url.includes('/video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
};

// PUBLIC – GET ALL
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error('Error fetching gallery:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – CREATE (with URL option)
router.post('/', adminAuth, upload.single('media'), async (req, res) => {
    try {
        console.log('Received POST request to /api/gallery');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // URL upload type
        if (uploadType === 'url') {
            if (!externalUrl) {
                return res.status(400).json({ message: 'URL is required for URL upload type' });
            }

            // Determine media type from URL if not provided
            let determinedMediaType = mediaType;
            if (!determinedMediaType) {
                determinedMediaType = isVideoUrl(externalUrl) ? 'video' : 'image';
            }

            const galleryItem = new Gallery({
                title,
                description,
                category: category || 'general',
                mediaUrl: externalUrl,
                externalUrl,
                mediaType: determinedMediaType,
                uploadType: 'url'
            });

            const saved = await galleryItem.save();
            console.log('Gallery item saved:', saved);
            return res.status(201).json(saved);
        }

        // File upload type
        if (!req.file) {
            return res.status(400).json({ message: 'Media file is required for file upload' });
        }

        // Determine media type from file
        const isVideo = req.file.mimetype.startsWith('video/');
        const folder = isVideo ? 'gallery/videos' : 'gallery/images';
        const resourceType = isVideo ? 'video' : 'image';
        
        console.log(`Uploading ${resourceType} to Cloudinary folder: ${folder}`);

        // Use Promise wrapper for Cloudinary upload
        const uploadToCloudinary = () => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { 
                        folder,
                        resource_type: resourceType,
                        chunk_size: 6000000, // 6MB chunks for large files
                        timeout: 120000 // 2 minute timeout
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload success:', result.secure_url);
                            resolve(result);
                        }
                    }
                );
                
                streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            });
        };

        try {
            const result = await uploadToCloudinary();
            
            const galleryItem = new Gallery({
                title,
                description,
                category: category || 'general',
                mediaUrl: result.secure_url,
                cloudinaryId: result.public_id,
                mediaType: isVideo ? 'video' : 'image',
                uploadType: 'upload'
            });

            const saved = await galleryItem.save();
            console.log('Gallery item saved with Cloudinary:', saved);
            res.status(201).json(saved);
            
        } catch (cloudinaryError) {
            console.error('Cloudinary upload failed:', cloudinaryError);
            return res.status(500).json({ 
                message: 'Failed to upload to Cloudinary', 
                error: cloudinaryError.message 
            });
        }

    } catch (err) {
        console.error('Create error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – UPDATE
router.put('/:id', adminAuth, upload.single('media'), async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // URL upload type
        if (uploadType === 'url') {
            if (!externalUrl) {
                return res.status(400).json({ message: 'URL is required for URL upload type' });
            }

            // Delete old Cloudinary file if exists
            if (item.cloudinaryId) {
                try {
                    const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                    await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                } catch (err) {
                    console.error('Failed to delete old Cloudinary file:', err);
                }
            }

            item.title = title;
            item.description = description;
            item.category = category;
            item.mediaUrl = externalUrl;
            item.externalUrl = externalUrl;
            item.mediaType = mediaType || 'image';
            item.uploadType = 'url';
            item.cloudinaryId = undefined;

            const updated = await item.save();
            return res.json(updated);
        }

        // File upload type
        if (req.file) {
            // Delete old Cloudinary file if exists
            if (item.cloudinaryId) {
                try {
                    const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                    await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                } catch (err) {
                    console.error('Failed to delete old Cloudinary file:', err);
                }
            }

            const isVideo = req.file.mimetype.startsWith('video/');
            const folder = isVideo ? 'gallery/videos' : 'gallery/images';
            const resourceType = isVideo ? 'video' : 'image';

            const uploadToCloudinary = () => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { 
                            folder,
                            resource_type: resourceType,
                            chunk_size: 6000000,
                            timeout: 120000
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );
                    
                    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
                });
            };

            try {
                const result = await uploadToCloudinary();

                item.title = title || item.title;
                item.description = description !== undefined ? description : item.description;
                item.category = category || item.category;
                item.mediaUrl = result.secure_url;
                item.cloudinaryId = result.public_id;
                item.mediaType = isVideo ? 'video' : 'image';
                item.uploadType = 'upload';
                item.externalUrl = undefined;

                const updated = await item.save();
                res.json(updated);
            } catch (cloudinaryError) {
                console.error('Cloudinary upload failed:', cloudinaryError);
                return res.status(500).json({ 
                    message: 'Failed to upload to Cloudinary', 
                    error: cloudinaryError.message 
                });
            }
        } else {
            // Update without changing media
            item.title = title || item.title;
            item.description = description !== undefined ? description : item.description;
            item.category = category || item.category;
            
            // If changing from URL to file type or vice versa
            if (uploadType && uploadType !== item.uploadType) {
                if (uploadType === 'url') {
                    if (!externalUrl) {
                        return res.status(400).json({ message: 'URL is required for URL upload type' });
                    }
                    
                    // Delete old Cloudinary file if exists
                    if (item.cloudinaryId) {
                        try {
                            const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                            await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                        } catch (err) {
                            console.error('Failed to delete old Cloudinary file:', err);
                        }
                    }
                    
                    item.mediaUrl = externalUrl;
                    item.externalUrl = externalUrl;
                    item.uploadType = 'url';
                    item.cloudinaryId = undefined;
                } else {
                    // Need file for upload type
                    return res.status(400).json({ message: 'Media file required for upload type' });
                }
            } else if (externalUrl && item.uploadType === 'url') {
                // Update URL for URL type
                item.mediaUrl = externalUrl;
                item.externalUrl = externalUrl;
            }
            
            if (mediaType) item.mediaType = mediaType;
            
            const updated = await item.save();
            res.json(updated);
        }

    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – DELETE
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        if (item.cloudinaryId) {
            try {
                const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                console.log('Deleted from Cloudinary:', item.cloudinaryId);
            } catch (err) {
                console.error('Failed to delete from Cloudinary:', err);
            }
        }

        await item.deleteOne();
        res.json({ message: 'Deleted successfully' });

    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
