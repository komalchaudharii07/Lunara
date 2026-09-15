const Chat = require("../models/Chat");

const getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({
      user: req.user,
    }).sort({ createdAt: 1 });

    res.json({
      chats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch chat history",
    });
  }
};

const clearChatHistory = async (req, res) => {
  try {
    await Chat.deleteMany({
      user: req.user,
    });

    res.json({
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear chat history",
    });
  }
};

module.exports = {
  getChatHistory,
  clearChatHistory,
};