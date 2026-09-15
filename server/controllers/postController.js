const Post = require("../models/Post");

// CREATE POST
const createPost = async (req, res) => {
  try {
    const { category, title, content, anonymous } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({
        message: "Category, title and content are required",
      });
    }

    const post = await Post.create({
      user: req.user,
      category,
      title,
      content,
      anonymous: anonymous ?? true,
    });

    const populatedPost = await post.populate(
      "user",
      "name"
    );

    res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create post",
    });
  }
};

// GET POSTS
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch posts",
    });
  }
};

// LIKE / UNLIKE POST
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (userId) => userId.toString() === req.user.toString()
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (userId) => userId.toString() !== req.user.toString()
      );
    } else {
      post.likes.push(req.user);
    }

    await post.save();

    res.json({
      message: alreadyLiked ? "Post unliked" : "Post liked",
      likes: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update like",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  toggleLike,
};