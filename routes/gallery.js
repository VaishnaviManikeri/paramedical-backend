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
    const isFacebook = url.includes('facebook.com');
    const isInstagram = url.includes('instagram.com');
    const isTwitter = url.includes('twitter.com') || url.includes('x.com');
    return isVideoExtension || isYouTube || isVimeo || isDrive || isDropbox || isFacebook || isInstagram || isTwitter;
};

// Extract YouTube Video ID
const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Get YouTube Embed URL
const getYouTubeEmbedUrl = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

// Get YouTube Thumbnail
const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
};

// Extract Vimeo Video ID
const getVimeoVideoId = (url) => {
    if (!url) return null;
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

// Get Vimeo Embed URL
const getVimeoEmbedUrl = (url) => {
    const videoId = getVimeoVideoId(url);
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
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
    return null;
};

// Get Generic Embed URL for any video platform
const getPlatformEmbedUrl = (url) => {
    if (!url) return null;
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return getYouTubeEmbedUrl(url);
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
        return getVimeoEmbedUrl(url);
    }
    
    // Google Drive
    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/d\/(.+?)\//);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
        }
    }
    
    // Dropbox
    if (url.includes('dropbox.com')) {
        // Convert dropbox link to raw download link
        let dropboxUrl = url;
        if (dropboxUrl.includes('?dl=0')) {
            dropboxUrl = dropboxUrl.replace('?dl=0', '?raw=1');
        }
        return dropboxUrl;
    }
    
    // For direct video URLs, return as is
    return url;
};

// Get platform name for display
const getPlatformName = (url) => {
    if (!url) return 'Video';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('drive.google.com')) return 'Google Drive';
    if (url.includes('dropbox.com')) return 'Dropbox';
    if (url.includes('facebook.com')) return 'Facebook';
    if (url.includes('instagram.com')) return 'Instagram';
    return 'External';
};

// ================= PUBLIC ROUTES =================

// GET all gallery items
router.get('/', async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        
        // Process items to add embed URLs and thumbnails for frontend
        const processedItems = items.map(item => {
            const itemObj = item.toObject();
            
            if (itemObj.mediaType === 'video') {
                // Add platform info
                itemObj.platform = getPlatformName(itemObj.mediaUrl);
                
                // Add embed URL for external videos
                if (itemObj.uploadType === 'url' || itemObj.externalUrl) {
                    const videoUrl = itemObj.externalUrl || itemObj.mediaUrl;
                    const embedUrl = getPlatformEmbedUrl(videoUrl);
                    if (embedUrl && embedUrl !== videoUrl) {
                        itemObj.embedUrl = embedUrl;
                    }
                    
                    // Add thumbnail URLs
                    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                        itemObj.thumbnailUrl = getYouTubeThumbnail(videoUrl);
                    } else if (videoUrl.includes('vimeo.com')) {
                        // Will be fetched async, but we can return existing or placeholder
                        itemObj.thumbnailUrl = itemObj.thumbnailUrl || 'https://via.placeholder.com/400x300?text=Vimeo+Video';
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
                
                // Ensure thumbnail exists
                if (!itemObj.thumbnailUrl) {
                    itemObj.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
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
                embedUrl = getPlatformEmbedUrl(externalUrl);
                
                // Get thumbnail for the video
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl);
                } else if (externalUrl.includes('vimeo.com')) {
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb || 'https://via.placeholder.com/400x300?text=Vimeo+Video';
                } else {
                    // For other video URLs, use a default thumbnail
                    thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
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
            console.log('Gallery item saved (URL):', saved._id, 'Platform:', platform);
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
                embedUrl = getPlatformEmbedUrl(externalUrl);
                
                if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                    thumbnailUrl = getYouTubeThumbnail(externalUrl);
                } else if (externalUrl.includes('vimeo.com')) {
                    const vimeoThumb = await getVimeoThumbnail(externalUrl);
                    thumbnailUrl = vimeoThumb || 'https://via.placeholder.com/400x300?text=Vimeo+Video';
                } else {
                    thumbnailUrl = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
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
            item.platform = isVideo ? 'Uploaded Video' : 'Uploaded Image';

            const updated = await item.save();
            console.log('Gallery item updated (Upload):', updated._id);
            res.json(updated);
        } else {
            // Update without changing media
            item.title = title ? title.trim() : item.title;
            item.description = description !== undefined ? description.trim() : item.description;
            item.category = category || item.category;
            
            // If media type changed, update platform
            if (mediaType && mediaType !== item.mediaType) {
                item.mediaType = mediaType;
                if (mediaType === 'video' && item.externalUrl) {
                    item.platform = getPlatformName(item.externalUrl);
                }
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

        // Delete from Cloudinary if it's an uploaded file
        if (item.cloudinaryId) {
            try {
                const resourceType = item.mediaType === 'video' ? 'video' : 'image';
                const result = await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
                console.log('Deleted from Cloudinary:', item.cloudinaryId, result);
            } catch (err) {
                console.error('Failed to delete from Cloudinary:', err);
                // Continue with deletion even if Cloudinary fails
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
