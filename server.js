const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const { initDatabase } = require('./src/db/database');
const { seedDatabase } = require('./src/db/seed');
const sseService = require('./src/services/sseService');

// Middleware
const requestLogger = require('./src/middleware/requestLogger');
const rateLimiter = require('./src/middleware/rateLimiter');
const errorHandler = require('./src/middleware/errorHandler');

// Routes
const authRoutes = require('./src/routes/auth');
const ordersRoutes = require('./src/routes/orders');
const customersRoutes = require('./src/routes/customers');
const productsRoutes = require('./src/routes/products');
const webhooksRoutes = require('./src/routes/webhooks');
const syncFailuresRoutes = require('./src/routes/syncFailures');
const analyticsRoutes = require('./src/routes/analytics');
const simulatorRoutes = require('./src/routes/simulator');

const app = express();

// Initialize Database & Seed
try {
  initDatabase();
  seedDatabase(false);
} catch (e) {
  console.error('[CRM Init Warning]:', e.message);
}

// CORS & Body Parsing (Preserving rawBody for HMAC-SHA256 verification)
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));

// Global Logging & Rate Limiting
app.use(requestLogger);
app.use(rateLimiter);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// Real-Time Server-Sent Events (SSE) Stream
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream Active' })}\n\n`);
  sseService.addClient(res);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/sync-failures', syncFailuresRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulator', simulatorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeSseClients: sseService.getClientCount()
  });
});

// SPA Fallback for client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Only listen on port if not running inside a Serverless Function (Vercel / Lambda)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerless) {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(` 🚀 CRM Central Order Management System is Running!`);
    console.log(` 🌐 URL: http://localhost:${config.port}`);
    console.log(` 🔐 Admin Login: admin@crm.local  /  admin123`);
    console.log(` 👤 Staff Login: staff@crm.local  /  staff123`);
    console.log(`=======================================================`);
  });
}

// CRITICAL FOR VERCEL SERVERLESS: Export express application directly
module.exports = app;
