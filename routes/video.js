const express = require('express');
const { Readable } = require('stream');
const Video = require('../models/Video');
const cloudinary = require('../config/cloudinary');
const uploadVideo = require('../middleware/uploadVideo');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_chunked_stream({
    folder: 'videos',
    resource_type: 'video',
    chunk_size: 20 * 1024 * 1024,
    timeout: 10 * 60 * 1000
  }, (error, result) => error ? reject(error) : resolve(result));

  Readable.from(file.buffer).pipe(stream);
});

const cloudinaryThumbnail = (publicId) => cloudinary.url(publicId, {
  resource_type: 'video',
  secure: true,
  format: 'jpg',
  transformation: [{ width: 900, height: 506, crop: 'fill' }, { start_offset: '0' }]
});

router.get('/', async (req, res, next) => {
  try {
    res.json(await Video.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found.' });
    res.json(video);
  } catch (error) {
    next(error);
  }
});

router.post('/', adminAuth, uploadVideo.single('video'), async (req, res, next) => {
  try {
    const title = req.body.title?.trim();
    const sourceType = req.body.sourceType;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    if (!['upload', 'link'].includes(sourceType)) {
      return res.status(400).json({ message: 'Choose upload or link.' });
    }

    const data = { title, description: req.body.description?.trim() || '', sourceType };
    if (sourceType === 'link') {
      const videoUrl = req.body.videoUrl?.trim();
      if (!isHttpUrl(videoUrl)) {
        return res.status(400).json({ message: 'Enter a valid http:// or https:// video link.' });
      }
      data.videoUrl = videoUrl;
    } else {
      if (!req.file) return res.status(400).json({ message: 'Select a video file.' });
      const uploaded = await uploadToCloudinary(req.file);
      data.videoUrl = uploaded.secure_url;
      data.cloudinaryId = uploaded.public_id;
      data.thumbnailUrl = cloudinaryThumbnail(uploaded.public_id);
      data.originalName = req.file.originalname;
      data.mimeType = req.file.mimetype;
    }

    res.status(201).json(await Video.create(data));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', adminAuth, uploadVideo.single('video'), async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found.' });

    const sourceType = req.body.sourceType || video.sourceType;
    if (!['upload', 'link'].includes(sourceType)) {
      return res.status(400).json({ message: 'Choose upload or link.' });
    }

    video.title = req.body.title?.trim() || video.title;
    video.description = req.body.description?.trim() || '';

    if (sourceType === 'link') {
      const videoUrl = req.body.videoUrl?.trim();
      if (!isHttpUrl(videoUrl)) {
        return res.status(400).json({ message: 'Enter a valid http:// or https:// video link.' });
      }
      if (video.cloudinaryId) {
        await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
      }
      video.sourceType = 'link';
      video.videoUrl = videoUrl;
      video.cloudinaryId = null;
      video.thumbnailUrl = '';
      video.originalName = '';
      video.mimeType = '';
    } else if (req.file) {
      const uploaded = await uploadToCloudinary(req.file);
      if (video.cloudinaryId) {
        await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
      }
      video.sourceType = 'upload';
      video.videoUrl = uploaded.secure_url;
      video.cloudinaryId = uploaded.public_id;
      video.thumbnailUrl = cloudinaryThumbnail(uploaded.public_id);
      video.originalName = req.file.originalname;
      video.mimeType = req.file.mimetype;
    } else if (video.sourceType !== 'upload') {
      return res.status(400).json({ message: 'Select a video file when changing to upload.' });
    }

    res.json(await video.save());
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found.' });
    if (video.cloudinaryId) {
      await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
    }
    await video.deleteOne();
    res.json({ message: 'Video deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
