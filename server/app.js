'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // Images and QR PNGs are loaded by the client app from a different origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], imgSrc: ["'self'", 'data:'], frameAncestors: ["'none'"] } },
    })
  );
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server requests (no Origin header) and the configured client origins.
        if (!origin || env.corsOrigins.includes(origin.replace(/\/+$/, ''))) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Order-Token'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  // Strip keys starting with "$" or containing "." from body, query and params (NoSQL injection).
  app.use(mongoSanitize({ replaceWith: '_' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'Krishna Dine API', docs: '/api/health' } }));
  app.use('/api', apiLimiter, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
