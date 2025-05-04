const express = require("express");
const cors = require("cors");
const suitRoutes = require("./routes/suits");
const enquiryRoutes = require("./routes/enquiries");
const userRoutes = require("./routes/users");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://cesursuits.netlify.app",
  "http://localhost:5000",
  "http://localhost:8080",
  "http://localhost:3000",
  "https://cesursuits-5b0aab475292.herokuapp.com",
  "https://us-central1-cesur-suits.cloudfunctions.net/testAuth",
].filter(Boolean);

// Replace your current CORS middleware with this:
app.use(cors({
  origin: [
    "https://cesursuits.netlify.app",
    "http://localhost:3000",
    "https://cesursuits-5b0aab475292.herokuapp.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Routes
// Handle preflight requests
app.options('*', cors());
app.use("/api/suits", suitRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/users", userRoutes); // New route

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
