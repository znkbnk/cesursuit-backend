// Updated server.js
const express = require('express');
const cors = require('cors');
const suitRoutes = require('./routes/suits');
const enquiryRoutes = require('./routes/enquiries');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://cesursuits.netlify.app',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://localhost:3000',
    'https://cesursuits-5b0aab475292.herokuapp.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    console.log('Request Origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/suits', suitRoutes);
app.use('/api/enquiries', enquiryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));