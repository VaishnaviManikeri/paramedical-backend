const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { auth, adminAuth } = require('../middleware/auth');

/**
 * =========================================================
 * PUBLIC: Get all ACTIVE & VALID announcements
 * Conditions:
 *  - isActive = true
 *  - startDate <= today
 *  - endDate >= today OR endDate = null
 * =========================================================
 */
router.get('/', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 🔥 IMPORTANT FIX

    const announcements = await Announcement.find({
      isActive: true,
      startDate: { $lte: today },
      $or: [
        { endDate: { $gte: today } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    }).sort({
      priority: 1,        // high → medium → low
      createdAt: -1       // latest first
    });

    res.json(announcements);
  } catch (error) {
    console.error('Public announcement fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

/**
 * =========================================================
 * ADMIN: Get ALL announcements (no filters)
 * =========================================================
 */
router.get('/all', adminAuth, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Admin announcement fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

/**
 * =========================================================
 * PUBLIC: Get single announcement by ID
 * =========================================================
 */
router.get('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get announcement by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch announcement' });
  }
});

/**
 * =========================================================
 * ADMIN: Create announcement
 * =========================================================
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    // Normalize start date
    const startDate = new Date(req.body.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Normalize end date
    const endDate = req.body.endDate
      ? new Date(req.body.endDate)
      : null;

    const announcement = new Announcement({
      title: req.body.title,
      content: req.body.content,
      priority: req.body.priority || 'medium',
      startDate,
      endDate,
      isActive: req.body.isActive === undefined ? true : req.body.isActive
    });

    const savedAnnouncement = await announcement.save();
    res.status(201).json(savedAnnouncement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * =========================================================
 * ADMIN: Update announcement
 * =========================================================
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.body.startDate) {
      const startDate = new Date(req.body.startDate);
      startDate.setHours(0, 0, 0, 0);
      updateData.startDate = startDate;
    }

    updateData.endDate = req.body.endDate || null;
    updateData.isActive =
      req.body.isActive === undefined ? true : req.body.isActive;

    updateData.updatedAt = Date.now();

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * =========================================================
 * ADMIN: Delete announcement
 * =========================================================
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

module.exports = router;
