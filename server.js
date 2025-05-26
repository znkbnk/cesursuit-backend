require('dotenv').config();
const express = require('express');
const cors = require('cors');
const suitRoutes = require('./routes/suits');
const enquiryRoutes = require('./routes/enquiries');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

// Configure allowed origins
const allowedOrigins = [
  'https://cesursuits.co.uk',
  'https://www.cesursuits.co.uk',
  'https://cesursuits.netlify.app',
  'http://localhost:3000'
];

// CORS Configuration - CRITICAL: This must be FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log('=== CORS Debug ===');
  console.log('Request method:', req.method);
  console.log('Request origin:', origin);
  console.log('Request URL:', req.url);
  
  // Always set CORS headers for allowed origins or if no origin (direct requests)
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
    
    console.log('CORS headers set for origin:', origin || 'no-origin');
  } else {
    console.log('CORS blocked for origin:', origin);
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(204).end();
  }
  
  next();
});

// Connect to MongoDB
connectDB();

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// API Routes
app.use('/api/suits', suitRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': res.get('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.get('Access-Control-Allow-Credentials')
    }
  });
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('=== Error Handler ===');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Origin:', req.headers.origin);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Handle 404s
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📍 Allowed origins:', allowedOrigins);
  console.log('🔧 CORS configured manually');
  console.log('🌐 Health check: /health');
  console.log('🧪 CORS test: /cors-test');
});