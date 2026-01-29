const express = require("express");
const Blog = require("../models/Blog");
const upload = require("../middleware/upload");

const router = express.Router();

/* ================= GET BLOGS (PUBLIC) ================= */
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* ================= GET BLOGS (ADMIN) ================= */
router.get("/all", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* ================= CREATE BLOG ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;

    // 🔒 VALIDATION (PREVENTS 500)
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const blog = await Blog.create({
      title,
      content,
      imageUrl: req.file.path // ✅ SAME AS GALLERY
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error("BLOG CREATE ERROR:", error);
    res.status(500).json({ message: "Blog creation failed" });
  }
});

/* ================= DELETE BLOG ================= */
router.delete("/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
