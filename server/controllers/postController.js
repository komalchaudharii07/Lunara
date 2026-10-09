const mongoose = require("mongoose");
const Post = require("../models/Post");

const CATEGORIES = ["Periods", "PCOS & PCOD", "Pregnancy", "Wellness"];

// Convert a DB post into a safe object for the client
const sanitizePost = (post, viewerId) => {
  const obj = post.toObject ? post.toObject() : post;
  const authorId = obj.user?._id?.toString() || obj.user?.toString();
  const viewer = viewerId.toString();
  const likes = obj.likes || [];

  return {
    _id: obj._id,
    category: obj.category,
    title: obj.title,
    content: obj.content,
    anonymous: obj.anonymous,
    createdAt: obj.createdAt,
    // only reveal the name when the author chose to be public
    user: obj.anonymous ? null : { name: obj.user?.name || "User" },
    isOwner: authorId === viewer,
    likesCount: likes.length,
    liked: likes.some((id) => id.toString() === viewer),
  };
};

// CREATE POST
const createPost = async (req, res) => {
  try {
    const { category, title, content, anonymous } = req.body;

    if (
      typeof category !== "string" ||
      typeof title !== "string" ||
      typeof content !== "string"
    ) {
      return res.status(400).json({ message: "Invalid post data" });
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (!cleanTitle || cleanTitle.length > 150) {
      return res
        .status(400)
        .json({ message: "Title is required (max 150 characters)" });
    }

    if (!cleanContent || cleanContent.length > 2000) {
      return res
        .status(400)
        .json({ message: "Content is required (max 2000 characters)" });
    }

    const post = await Post.create({
      user: req.user,
      category,
      title: cleanTitle,
      content: cleanContent,
      anonymous: typeof anonymous === "boolean" ? anonymous : true,
    });

    const populated = await post.populate("user", "name");

    res.status(201).json({
      message: "Post created successfully",
      post: sanitizePost(populated, req.user),
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// GET POSTS
const getPosts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const filter = {};
    if (CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const posts = await Post.find(filter)
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ posts: posts.map((p) => sanitizePost(p, req.user)) });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// LIKE / UNLIKE (atomic)
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // If the user already liked it, remove the like
    let post = await Post.findOneAndUpdate(
      { _id: id, likes: req.user },
      { $pull: { likes: req.user } },
      { new: true }
    );

    let liked = false;

    // Otherwise add the like
    if (!post) {
      post = await Post.findByIdAndUpdate(
        id,
        { $addToSet: { likes: req.user } },
        { new: true }
      );
      liked = true;
    }

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ likesCount: post.likes.length, liked });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ message: "Failed to update like" });
  }
};

module.exports = { createPost, getPosts, toggleLike };