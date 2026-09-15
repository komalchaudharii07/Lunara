const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const cycleRoutes = require("./routes/cycleRoutes");
const aiRoutes = require("./routes/aiRoutes");
const chatRoutes = require("./routes/chatRoutes");
const postRoutes = require("./routes/postRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/reviews", reviewRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Lunara API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});