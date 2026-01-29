const express = require('express');
const router = express.Router();
const Career = require('../models/Career');
const { auth, adminAuth } = require('../middleware/auth');

/**
 * ✅ PUBLIC: Get all ACTIVE careers
 * - isActive must be true
 * - deadline must be future OR null OR not set
 */
router.get('/', async (req, res) => {
    try {
        const careers = await Career.find({
            isActive: true,
            $or: [
                { applicationDeadline: { $gte: new Date() } },
                { applicationDeadline: null },
                { applicationDeadline: { $exists: false } }
            ]
        }).sort({ createdAt: -1 });

        res.json(careers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * ✅ ADMIN: Get ALL careers
 */
router.get('/all', adminAuth, async (req, res) => {
    try {
        const careers = await Career.find().sort({ createdAt: -1 });
        res.json(careers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * ✅ Get single career
 */
router.get('/:id', async (req, res) => {
    try {
        const career = await Career.findById(req.params.id);
        if (!career) {
            return res.status(404).json({ message: 'Career not found' });
        }
        res.json(career);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * ✅ CREATE career (ADMIN)
 */
router.post('/', adminAuth, async (req, res) => {
    try {
        const career = new Career(req.body);
        const savedCareer = await career.save();
        res.status(201).json(savedCareer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * ✅ UPDATE career (ADMIN)
 */
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const career = await Career.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );

        if (!career) {
            return res.status(404).json({ message: 'Career not found' });
        }

        res.json(career);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * ✅ DELETE career (ADMIN)
 */
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const career = await Career.findByIdAndDelete(req.params.id);
        if (!career) {
            return res.status(404).json({ message: 'Career not found' });
        }

        res.json({ message: 'Career deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
