const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Helper to check if Cloudinary URL is video
const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg'];
    const isVideoExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext));
    const isYouTubeVimeo = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
    return isVideoExtension || isYouTubeVimeo;
};

// Helper to generate video thumbnail from Cloudinary URL
const generateVideoThumbnail = (videoUrl, cloudinaryId = null) => {
    if (cloudinaryId) {
        // If it's a Cloudinary video, generate thumbnail using Cloudinary transformations
        return cloudinary.url(cloudinaryId, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [
                { start_offset: '0' },
                { duration: '1' },
                { flags: 'layer_apply' }
            ]
        });
    } else if (videoUrl && videoUrl.includes('cloudinary.com')) {
        // Extract public ID from Cloudinary URL and generate thumbnail
        const publicIdMatch = videoUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
        if (publicIdMatch && publicIdMatch[1]) {
            return cloudinary.url(publicIdMatch[1], {
                resource_type: 'video',
                format: 'jpg',
                transformation: [
                    { start_offset: '0' },
                    { duration: '1' }
                ]
            });
        }
    }
    // Return null for external videos (YouTube, Vimeo, or direct URLs)
    return null;
};

// Helper to get YouTube thumbnail
const getYouTubeThumbnail = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
    }
    return null;
};

// Helper to get Vimeo thumbnail
const getVimeoThumbnail = async (url) => {
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    if (match && match[1]) {
        try {
            const response = await fetch(`https://vimeo.com/api/v2/video/${match[1]}.json`);
            const data = await response.json();
            if (data && data[0] && data[0].thumbnail_large) {
                return data[0].thumbnail_large;
            }
        } catch (error) {
            console.error('Failed to fetch Vimeo thumbnail:', error);
        }
    }
    return null;
};

// PUBLIC – GET ALL
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        
        // Add thumbnail URL to each item
        const itemsWithThumbnails = items.map(item => {
            const itemObj = item.toObject();
            
            // Generate thumbnail based on media type and source
            if (itemObj.mediaType === 'video') {
                // Check for YouTube
                if (itemObj.externalUrl && itemObj.externalUrl.includes('youtube.com')) {
                    itemObj.thumbnailUrl = getYouTubeThumbnail(itemObj.externalUrl);
                }
                // Check for Vimeo
                else if (itemObj.externalUrl && itemObj.externalUrl.includes('vimeo.com')) {
                    // We'll fetch this asynchronously, return placeholder for now
                    itemObj.thumbnailUrl = null;
                }
                // Cloudinary video
                else if (itemObj.cloudinaryId) {
                    itemObj.thumbnailUrl = generateVideoThumbnail(itemObj.mediaUrl, itemObj.cloudinaryId);
                }
                // Direct video URL - try to generate thumbnail if Cloudinary
                else if (itemObj.mediaUrl && itemObj.mediaUrl.includes('cloudinary.com')) {
                    itemObj.thumbnailUrl = generateVideoThumbnail(itemObj.mediaUrl);
                }
                // For external video URLs without thumbnail support, use a default video thumbnail
                else {
                    itemObj.thumbnailUrl = '/video-placeholder.png';
                }
            } else {
                // For images, use the media URL as thumbnail
                itemObj.thumbnailUrl = itemObj.mediaUrl;
            }
            
            return itemObj;
        });
        
        res.json(itemsWithThumbnails);
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
        console.log('File received:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file');
        
        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        // URL upload type
        if (uploadType === 'url') {
            if (!externalUrl || externalUrl.trim() === '') {
                return res.status(400).json({ message: 'URL is required for URL upload type' });
            }

            // Determine media type from URL if not provided
            let determinedMediaType = mediaType;
            if (!determinedMediaType || determinedMediaType === 'image') {
                determinedMediaType = isVideoUrl(externalUrl) ? 'video' : 'image';
            }

            let thumbnailUrl = null;
            
            // Generate thumbnail for video URLs
            if (determinedMediaType === 'video') {
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl);
                } else if (externalUrl.includes('vimeo.com')) {
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb;
                }
                // For other video URLs, we'll use a default placeholder
            }

            const galleryItem = new Gallery({
                title: title.trim(),
                description: description ? description.trim() : '',
                category: category || 'general',
                mediaUrl: externalUrl.trim(),
                externalUrl: externalUrl.trim(),
                mediaType: determinedMediaType,
                uploadType: 'url',
                thumbnailUrl: thumbnailUrl // Store generated thumbnail
            });

            const saved = await galleryItem.save();
            console.log('Gallery item saved (URL):', saved._id);
            return res.status(201).json(saved);
        }

        // File upload type
        if (!req.file) {
            return res.status(400).json({ message: 'Please select a file to upload' });
        }

        // Determine media type from file
        const isVideo = req.file.mimetype.startsWith('video/');
        const folder = isVideo ? 'gallery/videos' : 'gallery/images';
        const resourceType = isVideo ? 'video' : 'image';
        
        console.log(`Uploading ${resourceType} to Cloudinary folder: ${folder}, file size: ${req.file.size} bytes`);

        // Upload to Cloudinary with Promise
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: folder,
                    resource_type: resourceType,
                    chunk_size: 6000000,
                    timeout: 120000,
                    eager: resourceType === 'video' ? [
                        { format: 'jpg', transformation: { start_offset: '0', duration: '1' } } // Generate thumbnail
                    ] : undefined
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
            
            // Create readable stream from buffer and pipe to Cloudinary
            const Readable = require('stream').Readable;
            const readableStream = new Readable();
            readableStream.push(req.file.buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);
        });

        let thumbnailUrl = null;
        
        // Generate thumbnail for video
        if (isVideo && uploadResult.public_id) {
            thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                resource_type: 'video',
                format: 'jpg',
                transformation: [
                    { start_offset: '0' },
                    { duration: '1' }
                ]
            });
        }

        const galleryItem = new Gallery({
            title: title.trim(),
            description: description ? description.trim() : '',
            category: category || 'general',
            mediaUrl: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            mediaType: isVideo ? 'video' : 'image',
            uploadType: 'upload',
            thumbnailUrl: thumbnailUrl
        });

        const saved = await galleryItem.save();
        console.log('Gallery item saved (Upload):', saved._id);
        res.status(201).json(saved);

    } catch (err) {
        console.error('Create error:', err);
        res.status(500).json({ 
            message: err.message || 'Failed to create gallery item',
            details: err.response?.data || err.toString()
        });
    }
});

// ADMIN – UPDATE
router.put('/:id', adminAuth, upload.single('media'), async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Gallery item not found' });

        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // URL upload type
        if (uploadType === 'url') {
            if (!externalUrl || externalUrl.trim() === '') {
                return res.status(400).json({ message: 'URL is required for URL upload type' });
            }

            // Delete old Cloudinary file if exists
            if (item.cloudinaryId) {
                try {
                    const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                    await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                    console.log('Deleted old Cloudinary file:', item.cloudinaryId);
                } catch (err) {
                    console.error('Failed to delete old Cloudinary file:', err);
                }
            }

            let thumbnailUrl = null;
            const determinedMediaType = mediaType || (isVideoUrl(externalUrl) ? 'video' : 'image');
            
            // Generate thumbnail for video URLs
            if (determinedMediaType === 'video') {
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl);
                } else if (externalUrl.includes('vimeo.com')) {
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb;
                }
            }

            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            item.mediaUrl = externalUrl.trim();
            item.externalUrl = externalUrl.trim();
            item.mediaType = determinedMediaType;
            item.uploadType = 'url';
            item.cloudinaryId = undefined;
            item.thumbnailUrl = thumbnailUrl;

            const updated = await item.save();
            return res.json(updated);
        }

        // File upload type - with new file
        if (req.file) {
            // Delete old Cloudinary file if exists
            if (item.cloudinaryId) {
                try {
                    const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                    await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                    console.log('Deleted old Cloudinary file:', item.cloudinaryId);
                } catch (err) {
                    console.error('Failed to delete old Cloudinary file:', err);
                }
            }

            const isVideo = req.file.mimetype.startsWith('video/');
            const folder = isVideo ? 'gallery/videos' : 'gallery/images';
            const resourceType = isVideo ? 'video' : 'image';

            // Upload to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { 
                        folder: folder,
                        resource_type: resourceType,
                        chunk_size: 6000000,
                        timeout: 120000,
                        eager: resourceType === 'video' ? [
                            { format: 'jpg', transformation: { start_offset: '0', duration: '1' } }
                        ] : undefined
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                
                const Readable = require('stream').Readable;
                const readableStream = new Readable();
                readableStream.push(req.file.buffer);
                readableStream.push(null);
                readableStream.pipe(uploadStream);
            });

            let thumbnailUrl = null;
            
            // Generate thumbnail for video
            if (isVideo && uploadResult.public_id) {
                thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: 'video',
                    format: 'jpg',
                    transformation: [
                        { start_offset: '0' },
                        { duration: '1' }
                    ]
                });
            }

            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            item.mediaUrl = uploadResult.secure_url;
            item.cloudinaryId = uploadResult.public_id;
            item.mediaType = isVideo ? 'video' : 'image';
            item.uploadType = 'upload';
            item.externalUrl = undefined;
            item.thumbnailUrl = thumbnailUrl;

            const updated = await item.save();
            res.json(updated);
        } else {
            // Update without changing media
            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            
            // If changing upload type
            if (uploadType && uploadType !== item.uploadType) {
                if (uploadType === 'url') {
                    if (!externalUrl || externalUrl.trim() === '') {
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
                    
                    let thumbnailUrl = null;
                    if (mediaType === 'video' || isVideoUrl(externalUrl)) {
                        if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                            thumbnailUrl = getYouTubeThumbnail(externalUrl);
                        } else if (externalUrl.includes('vimeo.com')) {
                            const vimeoThumb = await getVimeoThumbnail(externalUrl);
                            thumbnailUrl = vimeoThumb;
                        }
                    }
                    
                    item.mediaUrl = externalUrl.trim();
                    item.externalUrl = externalUrl.trim();
                    item.uploadType = 'url';
                    item.cloudinaryId = undefined;
                    item.thumbnailUrl = thumbnailUrl;
                } else {
                    return res.status(400).json({ message: 'Media file required for upload type' });
                }
            } else if (externalUrl && item.uploadType === 'url') {
                // Update URL for URL type
                item.mediaUrl = externalUrl.trim();
                item.externalUrl = externalUrl.trim();
                
                // Update thumbnail if it's a video
                if (item.mediaType === 'video') {
                    if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                        item.thumbnailUrl = getYouTubeThumbnail(externalUrl);
                    } else if (externalUrl.includes('vimeo.com')) {
                        const vimeoThumb = await getVimeoThumbnail(externalUrl);
                        item.thumbnailUrl = vimeoThumb;
                    }
                }
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
        if (!item) return res.status(404).json({ message: 'Gallery item not found' });

        // Delete from Cloudinary if it's an uploaded file
        if (item.cloudinaryId) {
            try {
                const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                const result = await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                console.log('Deleted from Cloudinary:', item.cloudinaryId, result);
            } catch (err) {
                console.error('Failed to delete from Cloudinary:', err);
            }
        }

        await item.deleteOne();
        res.json({ message: 'Gallery item deleted successfully' });

    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
