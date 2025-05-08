require("dotenv").config();
const express = require("express");
const cors = require("cors");
const suitRoutes = require("./routes/suits");
const enquiryRoutes = require("./routes/enquiries");
const userRoutes = require("./routes/users");
const orderRoutes = require("./routes/orders");
const connectDB = require("./config/db");
const path = require("path");

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

app.use(cors({
  origin: [
    "https://cesursuits.netlify.app",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://cesursuits-5b0aab475292.herokuapp.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Serve static files from Uploads directory
app.use("/Uploads", express.static(path.join(__dirname, "Uploads")));

// Routes
app.use("/api/suits", suitRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));