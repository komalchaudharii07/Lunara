const Chat = require("../models/Chat");

const getChatHistory = async (req, res) => {
  try {
    // latest 100 messages, returned oldest first
    const chats = await Chat.find({ user: req.user })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("role message createdAt");

    res.json({ chats: chats.reverse() });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

const clearChatHistory = async (req, res) => {
  try {
    await Chat.deleteMany({ user: req.user });

    res.json({ message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("Clear chat history error:", error);
    res.status(500).json({ message: "Failed to clear chat history" });
  }
};

module.exports = {
  getChatHistory,
  clearChatHistory,
};