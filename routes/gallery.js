const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Helper functions for video URL handling
const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg', '.mpg'];
    const isVideoExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext));
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');
    const isDrive = url.includes('drive.google.com');
    const isDropbox = url.includes('dropbox.com');
    return isVideoExtension || isYouTube || isVimeo || isDrive || isDropbox;
};

const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const getYouTubeEmbedUrl = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
};

const getVimeoVideoId = (url) => {
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

const getVimeoEmbedUrl = (url) => {
    const videoId = getVimeoVideoId(url);
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
};

const getVimeoThumbnail = async (url) => {
    const videoId = getVimeoVideoId(url);
    if (videoId) {
        try {
            const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
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

// Helper to get embed URL for any video
const getVideoEmbedUrl = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return getYouTubeEmbedUrl(url);
    }
    if (url.includes('vimeo.com')) {
        return getVimeoEmbedUrl(url);
    }
    // For direct video URLs, return as is
    return url;
};

// PUBLIC – GET ALL
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        
        // Process items to add embed URLs and thumbnails
        const processedItems = items.map(item => {
            const itemObj = item.toObject();
            
            if (itemObj.mediaType === 'video') {
                // Add embed URL for external videos
                if (itemObj.uploadType === 'url') {
                    const embedUrl = getVideoEmbedUrl(itemObj.mediaUrl);
                    if (embedUrl && embedUrl !== itemObj.mediaUrl) {
                        itemObj.embedUrl = embedUrl;
                    }
                    
                    // Add thumbnail
                    if (itemObj.mediaUrl.includes('youtube.com') || itemObj.mediaUrl.includes('youtu.be')) {
                        itemObj.thumbnailUrl = getYouTubeThumbnail(itemObj.mediaUrl);
                    } else if (itemObj.mediaUrl.includes('vimeo.com')) {
                        // We'll handle this async, but for now use placeholder
                        itemObj.thumbnailUrl = null;
                    }
                }
                
                // For uploaded videos, generate Cloudinary thumbnail
                if (itemObj.cloudinaryId) {
                    itemObj.thumbnailUrl = cloudinary.url(itemObj.cloudinaryId, {
                        resource_type: 'video',
                        format: 'jpg',
                        transformation: [
                            { start_offset: '0' },
                            { duration: '1' }
                        ]
                    });
                }
            }
            
            return itemObj;
        });
        
        res.json(processedItems);
    } catch (err) {
        console.error('Error fetching gallery:', err);
        res.status(500).json({ message: err.message });
    }
});

// ADMIN – CREATE
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

            // Determine media type
            let determinedMediaType = mediaType;
            if (!determinedMediaType) {
                determinedMediaType = 'image';
                // Check if it's a video URL
                if (isVideoUrl(externalUrl)) {
                    determinedMediaType = 'video';
                }
            }

            let thumbnailUrl = null;
            let embedUrl = null;
            
            // Process video URLs
            if (determinedMediaType === 'video') {
                embedUrl = getVideoEmbedUrl(externalUrl);
                
                // Get thumbnail for the video
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl);
                } else if (externalUrl.includes('vimeo.com')) {
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb;
                }
                // For direct video URLs, we'll use a default thumbnail
                else {
                    thumbnailUrl = '/video-placeholder.png';
                }
            }

            const galleryItem = new Gallery({
                title: title.trim(),
                description: description ? description.trim() : '',
                category: category || 'general',
                mediaUrl: externalUrl.trim(),
                externalUrl: externalUrl.trim(),
                mediaType: determinedMediaType,
                uploadType: 'url',
                thumbnailUrl: thumbnailUrl,
                embedUrl: embedUrl
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
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        console.log('Cloudinary upload success:', result.secure_url);
                        resolve(result);
                    }
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
            let embedUrl = null;
            const determinedMediaType = mediaType || (isVideoUrl(externalUrl) ? 'video' : 'image');
            
            // Process video URLs
            if (determinedMediaType === 'video') {
                embedUrl = getVideoEmbedUrl(externalUrl);
                
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
            item.embedUrl = embedUrl;

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
            item.embedUrl = undefined;

            const updated = await item.save();
            res.json(updated);
        } else {
            // Update without changing media
            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            
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
        res.json({ message: 'Gallery item deleted successfully' });

    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
