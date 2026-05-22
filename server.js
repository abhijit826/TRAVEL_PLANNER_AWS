const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env for local development.
// On EC2, use environment variables set via the launch script or SSM.
dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const tripRoutes = require('./routes/trip');
const travelWalletRoutes = require('./routes/travelWallet');
const conciergeRoutes = require('./routes/concierge');
const { protect } = require('./middleware/authMiddleware');

// ─── NOTE ─────────────────────────────────────────────────────────────────────
// MongoDB / Mongoose has been removed. Data is now stored in Amazon DynamoDB.
// The DynamoDB client is initialized lazily in utils/dynamodb.js — no explicit
// connection call is needed; the AWS SDK handles it automatically using the
// EC2 IAM Instance Profile (or env vars for local dev).
//
// The /api/generate-itinerary route has been moved to AWS Lambda.
// Amazon API Gateway routes that path directly to the Lambda function.
// ──────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());

// ── Request Logger Middleware ────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    // Avoid logging sensitive tokens if password is present
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***';
    console.log('📦 Request Body:', JSON.stringify(logBody));
  }
  
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    console.log(`⏱️ [${new Date().toISOString()}] Response Status: ${res.statusCode} for ${req.method} ${req.originalUrl || req.url}`);
    return originalEnd.apply(res, arguments);
  };
  next();
});

// ── Health Check (for ALB / monitoring) ──────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', region: process.env.AWS_REGION }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', protect, tripRoutes);
app.use('/api/travel-wallet', travelWalletRoutes);
app.use('/api/concierge', protect, conciergeRoutes);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Region : ${process.env.AWS_REGION || 'ap-south-1'}`);
  console.log(`   Env    : ${process.env.NODE_ENV || 'development'}`);
});