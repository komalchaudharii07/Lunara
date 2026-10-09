const { GoogleGenAI } = require("@google/genai");
const Cycle = require("../models/Cycle");
const Chat = require("../models/Chat");

console.log("Key End",process.env.GEMINI_API_KEY?.slice(-4));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});



const askLunaraAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a message",
      });
    }

    const userMessage = message.trim();

    // Save user message
    await Chat.create({
      user: req.user,
      role: "user",
      message: userMessage,
    });

    // Get recent conversation
    const recentChats = await Chat.find({
      user: req.user,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("role message");

    const conversationContext = recentChats
      .reverse()
      .map(
        (chat) =>
          `${chat.role === "user" ? "User" : "Lunara AI"}: ${chat.message
          }`
      )
      .join("\n");

    // Get cycle history
    const cycles = await Cycle.find({
      user: req.user,
    })
      .sort({ periodStartDate: -1 })
      .limit(6)
      .select(
        "periodStartDate periodEndDate cycleLength periodLength symptoms mood"
      );

    const cycleContext =
      cycles.length > 0
        ? cycles
          .map(
            (cycle) =>
              `Period start: ${cycle.periodStartDate}, ` +
              `Period end: ${cycle.periodEndDate || "Not recorded"
              }, ` +
              `Cycle length: ${cycle.cycleLength || "Not available"
              }, ` +
              `Period length: ${cycle.periodLength || "Not available"
              }, ` +
              `Symptoms: ${cycle.symptoms?.join(", ") || "None"
              }, ` +
              `Mood: ${cycle.mood || "Not recorded"
              }`
          )
          .join("\n")
        : "No cycle history available yet.";

    const prompt = `
You are Lunara AI, a supportive women's health assistant.

USER'S CYCLE HISTORY:
${cycleContext}

RECENT CONVERSATION:
${conversationContext}

CURRENT USER MESSAGE:
${userMessage}

Instructions:
- Understand the current message using the recent conversation when relevant.
- Give clear, simple and supportive answers.
- Use the user's cycle history when relevant.
- Never invent user data.
- NEVER assume a 28-day cycle or any other cycle length unless it is explicitly present in the user's stored cycle data.
- If cycle length is not available, clearly say that there is not enough cycle history to make a reliable date-based prediction.
- Do not calculate a next-period date, ovulation date, or fertile window using an assumed cycle length.
- Previous AI responses may contain mistakes. Treat stored user data as the source of truth, not previous AI-generated claims.
- Do not claim fertility or cycle predictions are exact.
- Do not diagnose medical conditions.
- For serious, severe, unusual, or worsening symptoms, recommend consulting a qualified healthcare professional.
- Do not replace a doctor.
- Keep responses concise and easy to understand.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const aiReply = response.text;

    // Save AI response
    await Chat.create({
      user: req.user,
      role: "ai",
      message: aiReply,
    });

    res.json({
      reply: aiReply,
    });
  } catch (error) {
    console.error("Lunara AI error:", error);

    res.status(500).json({
      message: "Failed to get AI response",
    });
  }
};

module.exports = {
  askLunaraAI,
};