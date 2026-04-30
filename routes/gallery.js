const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// ================= HELPER FUNCTIONS =================

// Check if URL is a video URL
const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg', '.mpg', '.3gp'];
    const isVideoExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext));
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');
    const isDrive = url.includes('drive.google.com');
    const isDropbox = url.includes('dropbox.com');
    return isVideoExtension || isYouTube || isVimeo || isDrive || isDropbox;
};

// Extract YouTube Video ID - handles all YouTube URL formats
const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?#]+)/,
        /youtube\.com\/shorts\/([^&?#]+)/,
        /youtube\.com\/live\/([^&?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

// Get YouTube Embed URL
const getYouTubeEmbedUrl = (url, autoplay = false) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return autoplay 
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
        : `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
};

// Get YouTube Thumbnail - multiple quality options
const getYouTubeThumbnail = (url, quality = 'maxresdefault') => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Different thumbnail qualities available
    const thumbnails = {
        maxresdefault: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        hqdefault: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        mqdefault: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        sddefault: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`
    };
    
    return thumbnails[quality] || thumbnails.maxresdefault;
};

// Extract Vimeo Video ID
const getVimeoVideoId = (url) => {
    if (!url) return null;
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

// Get Vimeo Embed URL
const getVimeoEmbedUrl = (url, autoplay = false) => {
    const videoId = getVimeoVideoId(url);
    if (!videoId) return null;
    return autoplay
        ? `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`
        : `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
};

// Get Vimeo Thumbnail
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
    return 'https://via.placeholder.com/400x300?text=Vimeo+Video';
};

// Get platform name
const getPlatformName = (url) => {
    if (!url) return 'Video';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('drive.google.com')) return 'Google Drive';
    if (url.includes('dropbox.com')) return 'Dropbox';
    return 'External Video';
};

// ================= PUBLIC ROUTES =================

// GET all gallery items
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        
        // Process items to ensure thumbnails are properly set
        const processedItems = items.map(item => {
            const itemObj = item.toObject();
            
            if (itemObj.mediaType === 'video') {
                // Add platform info
                itemObj.platform = getPlatformName(itemObj.mediaUrl);
                
                // IMPORTANT: Ensure thumbnail URL is properly set for YouTube videos
                if (itemObj.externalUrl && (itemObj.externalUrl.includes('youtube.com') || itemObj.externalUrl.includes('youtu.be'))) {
                    // Always generate fresh YouTube thumbnail URL
                    itemObj.thumbnailUrl = getYouTubeThumbnail(itemObj.externalUrl, 'maxresdefault');
                    console.log('YouTube thumbnail generated for:', itemObj.title, itemObj.thumbnailUrl);
                }
                // For Vimeo videos
                else if (itemObj.externalUrl && itemObj.externalUrl.includes('vimeo.com')) {
                    if (!itemObj.thumbnailUrl || itemObj.thumbnailUrl.includes('placeholder')) {
                        // We'll use a placeholder, frontend will fetch if needed
                        itemObj.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Vimeo+Video';
                    }
                }
                // For uploaded videos with Cloudinary
                else if (itemObj.cloudinaryId) {
                    itemObj.thumbnailUrl = cloudinary.url(itemObj.cloudinaryId, {
                        resource_type: 'video',
                        format: 'jpg',
                        transformation: [
                            { start_offset: '0' },
                            { duration: '1' }
                        ]
                    });
                }
                // Default fallback
                else if (!itemObj.thumbnailUrl) {
                    itemObj.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
                }
                
                // Add embed URL
                if (itemObj.externalUrl) {
                    itemObj.embedUrl = getYouTubeEmbedUrl(itemObj.externalUrl) || getVimeoEmbedUrl(itemObj.externalUrl);
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

// ================= ADMIN ROUTES =================

// CREATE gallery item
router.post('/', adminAuth, upload.single('media'), async (req, res) => {
    try {
        console.log('Received POST request to /api/gallery');
        console.log('Request body:', req.body);
        
        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        // ================= URL UPLOAD TYPE =================
        if (uploadType === 'url') {
            if (!externalUrl || externalUrl.trim() === '') {
                return res.status(400).json({ message: 'URL is required for URL upload type' });
            }

            // Determine media type from URL
            let determinedMediaType = mediaType;
            if (!determinedMediaType) {
                determinedMediaType = 'image';
                if (isVideoUrl(externalUrl)) {
                    determinedMediaType = 'video';
                }
            }

            let thumbnailUrl = null;
            let embedUrl = null;
            let platform = null;
            
            // Process video URLs
            if (determinedMediaType === 'video') {
                platform = getPlatformName(externalUrl);
                
                // Get YouTube thumbnail and embed URL
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl, 'maxresdefault');
                    embedUrl = getYouTubeEmbedUrl(externalUrl);
                    console.log('YouTube thumbnail generated:', thumbnailUrl);
                }
                // Get Vimeo thumbnail and embed URL
                else if (externalUrl.includes('vimeo.com')) {
                    embedUrl = getVimeoEmbedUrl(externalUrl);
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb || 'https://via.placeholder.com/400x300?text=Vimeo+Video';
                }
                // For other video URLs
                else {
                    thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
                    embedUrl = externalUrl;
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
                embedUrl: embedUrl,
                platform: platform
            });

            const saved = await galleryItem.save();
            console.log('Gallery item saved (URL):', saved._id);
            console.log('Thumbnail URL saved:', saved.thumbnailUrl);
            return res.status(201).json(saved);
        }

        // ================= FILE UPLOAD TYPE =================
        if (!req.file) {
            return res.status(400).json({ message: 'Please select a file to upload' });
        }

        // Determine media type from file
        const isVideo = req.file.mimetype.startsWith('video/');
        const folder = isVideo ? 'gallery/videos' : 'gallery/images';
        const resourceType = isVideo ? 'video' : 'image';
        
        console.log(`Uploading ${resourceType} to Cloudinary folder: ${folder}`);

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
            thumbnailUrl: thumbnailUrl,
            platform: isVideo ? 'Uploaded Video' : 'Uploaded Image'
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

// UPDATE gallery item
router.put('/:id', adminAuth, upload.single('media'), async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Gallery item not found' });

        const { title, description, category, mediaType, uploadType, externalUrl } = req.body;

        // ================= URL UPLOAD TYPE =================
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
            let platform = null;
            const determinedMediaType = mediaType || (isVideoUrl(externalUrl) ? 'video' : 'image');
            
            // Process video URLs
            if (determinedMediaType === 'video') {
                platform = getPlatformName(externalUrl);
                
                // Get YouTube thumbnail and embed URL
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl, 'maxresdefault');
                    embedUrl = getYouTubeEmbedUrl(externalUrl);
                }
                // Get Vimeo thumbnail and embed URL
                else if (externalUrl.includes('vimeo.com')) {
                    embedUrl = getVimeoEmbedUrl(externalUrl);
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb || 'https://via.placeholder.com/400x300?text=Vimeo+Video';
                }
                // For other video URLs
                else {
                    thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
                    embedUrl = externalUrl;
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
            item.platform = platform;

            const updated = await item.save();
            console.log('Gallery item updated (URL):', updated._id);
            return res.json(updated);
        }

        // ================= FILE UPLOAD TYPE =================
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
            item.platform = isVideo ? 'Uploaded Video' : 'Uploaded Image';

            const updated = await item.save();
            res.json(updated);
        } else {
            // Update without changing media
            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            
            if (mediaType && mediaType !== item.mediaType) {
                item.mediaType = mediaType;
            }
            
            const updated = await item.save();
            res.json(updated);
        }

    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE gallery item
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
