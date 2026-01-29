const express = require("express");
const Blog = require("../models/Blog");
const upload = require("../middleware/upload");

const router = express.Router();

/* ================= PUBLIC ================= */
router.get("/", async (req, res, next) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    next(err);
  }
});

/* ================= ADMIN ================= */
router.get("/all", async (req, res, next) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    next(err);
  }
});

/* ================= CREATE BLOG ================= */
router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const blog = await Blog.create({
      title: req.body.title,
      content: req.body.content,
      imageUrl: req.file.path   // ✅ SAME AS GALLERY
    });

    res.status(201).json(blog);
  } catch (err) {
    next(err);
  }
});

/* ================= DELETE BLOG ================= */
router.delete("/:id", async (req, res, next) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
