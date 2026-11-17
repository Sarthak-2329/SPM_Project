'use strict';

/**
 * CMMS Server — Entry Point
 * Loads env, initialises Express, mounts all routes, starts the HTTP server.
 */

require('dotenv').config();
require('express-async-errors'); // patches Express to forward async errors to error handler

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { env } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { initScheduler } = require('./config/cron');

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); // allow cross-origin assets (e.g. uploaded images, QR codes)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Always allow any Vercel deployment URL, localhost, or match against CORS_ORIGIN
      const configured = env.CORS_ORIGIN || '*';
      if (
        configured === '*' ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        configured.split(',').map((o) => o.trim().replace(/\/+$/, '')).includes(origin.replace(/\/+$/, ''))
      ) {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    credentials: true,
  })
);
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (uploaded photos, QR codes) ─────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Serve Built Frontend in Production (if client/dist exists) ───────────────
const fs = require('fs');
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server (only if not running in test mode or required by Supertest) ─
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.info(`🚀 CMMS server running on http://localhost:${PORT}`);
    console.info(`   Environment : ${env.NODE_ENV}`);
    console.info(`   API base    : http://localhost:${PORT}/api`);
    initScheduler();
  });
}

module.exports = app; // exported for Supertest
