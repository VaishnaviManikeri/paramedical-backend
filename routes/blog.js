const express = require("express");
const Blog = require("../models/Blog");
const upload = require("../middleware/upload");

const router = express.Router();

// PUBLIC
router.get("/", async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
});

// ADMIN
router.get("/all", async (req, res) => {
  const blogs = await Blog.find();
  res.json(blogs);
});

router.post("/", upload.single("image"), async (req, res) => {
  const blog = await Blog.create({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.file.path
  });
  res.json(blog);
});

router.delete("/:id", async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
