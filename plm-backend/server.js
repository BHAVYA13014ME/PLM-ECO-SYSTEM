// ─── Load Environment Variables (must be first) ───
require('dotenv').config();

// ─── Auto-pass async errors to next() ───
require('express-async-errors');

// ─── Core Imports ───
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ─── Custom Middleware ───
const errorHandler = require('./src/middleware/errorHandler');

// ─── Routes ───
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const bomRoutes = require('./src/routes/bomRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const ecoRoutes = require('./src/routes/ecoRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

// ─── Utils ───
const ApiResponse = require('./src/utils/ApiResponse');
const { seedUsers } = require('./src/utils/seed');
const { seedDefaultStages } = require('./src/services/stageService');
const Product = require('./src/models/Product');

// ──────────────────────────────────────────────────
// 1. VALIDATE REQUIRED ENV VARS
// ──────────────────────────────────────────────────
const requiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

// ──────────────────────────────────────────────────
// 2. CREATE EXPRESS APP
// ──────────────────────────────────────────────────
const app = express();
const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    ...(process.env.FRONTEND_URLS || '').split(',').map((item) => item.trim()),
  ].filter(Boolean)
);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
};
const rateLimitHandler = (req, res, _next, options) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(options.statusCode).json(options.message);
};

// ──────────────────────────────────────────────────
// 3. MIDDLEWARE STACK (exact order per architecture)
// ──────────────────────────────────────────────────

// 3a. Security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"] } }));

// 3a.2 Rate limiting
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many requests, please try again later.', data: null },
  skip: (req) => req.method === 'OPTIONS',
  handler: rateLimitHandler,
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many refresh attempts, please try again later.', data: null },
  skip: (req) => req.method === 'OPTIONS',
  handler: rateLimitHandler,
});
const generalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 300,
  skip: (req) => req.method === 'OPTIONS' || req.originalUrl.startsWith('/api/v1/auth'),
  handler: rateLimitHandler,
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/refresh-token', refreshLimiter);
app.use('/api/v1', generalLimiter);

// 3b. CORS — allow frontend origin with credentials
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3c. Parse JSON bodies
app.use(express.json());

// 3d. Parse cookies (for refresh token)
app.use(cookieParser());

// 3e. Sanitize inputs — strip $ and . to prevent NoSQL injection
app.use(mongoSanitize());

// 3f. HTTP request logging (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ──────────────────────────────────────────────────
// 4. ROUTES
// ──────────────────────────────────────────────────

// Health check
app.get('/api/v1/health', (req, res) => {
  new ApiResponse(res, 200, 'Server healthy', null);
});

// Mount route handlers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/bom', bomRoutes);
app.use('/api/v1/eco', ecoRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/reports', reportRoutes);

// ──────────────────────────────────────────────────
// 5. ERROR HANDLER (must be LAST middleware)
// ──────────────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────────────
// 6. DATABASE CONNECTION & SERVER START
// ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 PLM Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
  );
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing process or change PORT in .env.`);
    process.exit(1);
  }
  throw err;
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Fail fast in dev if DB not available
    });
    console.log('✅ MongoDB connected successfully');

    // Align indexes with schema (drops legacy unique sku_1, creates sku+version unique).
    await Product.syncIndexes();

    // Seed default users on startup
    await seedUsers();
    await seedDefaultStages();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('⚠️  Server will continue running but database operations will fail.');
    // In production, you may want: process.exit(1);
  }
};

connectDB();

module.exports = app;
