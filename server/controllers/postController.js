const mongoose = require("mongoose");
const Post = require("../models/Post");

const CATEGORIES = ["Periods", "PCOS & PCOD", "Pregnancy", "Wellness"];
const REPORT_REASONS = ["spam", "harassment", "misinformation", "self-harm", "other"];
const AUTO_HIDE_AT = 3; // reports from different people before a post is hidden

// words that suggest the author may be in crisis
const CRISIS_PATTERNS = [
  /\b(suicid\w*|kill myself|end my life|want to die|self[- ]?harm|hurt myself|harm myself)\b/i,
];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

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

    const crisis = CRISIS_PATTERNS.some(
      (p) => p.test(cleanTitle) || p.test(cleanContent)
    );

    const post = await Post.create({
      user: req.user,
      category,
      title: cleanTitle,
      content: cleanContent,
      anonymous: typeof anonymous === "boolean" ? anonymous : true,
      flaggedCrisis: crisis,
    });

    const populated = await post.populate("user", "name");

    res.status(201).json({
      message: "Post created successfully",
      post: sanitizePost(populated, req.user),
      // the app shows helpline numbers to the author when this is true
      crisis,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// GET POSTS (hidden and removed posts never appear)
const getPosts = async (req, res) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 200);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const filter = { status: "visible" };
    if (CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const posts = await Post.find(filter)
      .populate("user", "name")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ posts: posts.map((p) => sanitizePost(p, req.user)) });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// DELETE MY POST
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // scoped to the owner, so nobody can delete someone else's post
    const deleted = await Post.findOneAndDelete({ _id: id, user: req.user });

    if (!deleted) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// REPORT A POST
const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: "Please choose a reason" });
    }

    const post = await Post.findOne({ _id: id, status: "visible" }).select(
      "user"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() === req.user) {
      return res
        .status(400)
        .json({ message: "You can't report your own post" });
    }

    // the filter makes this a no-op for someone who already reported it
    const result = await Post.updateOne(
      { _id: id, "reports.user": { $ne: req.user } },
      {
        $push: { reports: { user: req.user, reason } },
        $inc: { reportCount: 1 },
        ...(reason === "self-harm" ? { $set: { flaggedCrisis: true } } : {}),
      }
    );

    if (result.modifiedCount) {
      // enough different people reported it: hide it until a moderator looks
      await Post.updateOne(
        { _id: id, reportCount: { $gte: AUTO_HIDE_AT }, status: "visible" },
        { $set: { status: "hidden" } }
      );
    }

    res.json({ message: "Thank you. Our team will review this post." });
  } catch (error) {
    console.error("Report post error:", error);
    res.status(500).json({ message: "Failed to report post" });
  }
};

// LIKE / UNLIKE (atomic)
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // If the user already liked it, remove the like
    let post = await Post.findOneAndUpdate(
      { _id: id, status: "visible", likes: req.user },
      { $pull: { likes: req.user } },
      { new: true }
    );

    let liked = false;

    // Otherwise add the like
    if (!post) {
      post = await Post.findOneAndUpdate(
        { _id: id, status: "visible" },
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

// ---------- moderators only ----------

// posts that were reported or flagged, newest first
const getModerationQueue = async (req, res) => {
  try {
    const posts = await Post.find({
      $or: [{ reportCount: { $gt: 0 } }, { flaggedCrisis: true }, { status: { $ne: "visible" } }],
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select("category title content status reportCount flaggedCrisis reports.reason createdAt")
      .lean();

    res.json({ posts });
  } catch (error) {
    console.error("Moderation queue error:", error);
    res.status(500).json({ message: "Failed to load the queue" });
  }
};

// set a post to visible / hidden / removed
const setPostStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!["visible", "hidden", "removed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const update = { status };
    // a moderator restoring a post clears its reports so it isn't hidden again at once
    const post = await Post.findByIdAndUpdate(
      id,
      status === "visible"
        ? { $set: update, $unset: { reports: 1 }, $inc: {} }
        : { $set: update },
      { new: true }
    ).select("status");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (status === "visible") {
      await Post.updateOne({ _id: id }, { $set: { reportCount: 0, reports: [] } });
    }

    res.json({ message: "Updated", status: post.status });
  } catch (error) {
    console.error("Set post status error:", error);
    res.status(500).json({ message: "Failed to update the post" });
  }
};

module.exports = {
  createPost,
  getPosts,
  toggleLike,
  deletePost,
  reportPost,
  getModerationQueue,
  setPostStatus,
};