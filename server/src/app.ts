// Express application factory: security headers, CORS, rate limiting, API
// routes, static client serving, and SPA fallback.

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { corsOrigins, isProd, isTest } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src -> repo root -> client/dist
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Railway runs behind a proxy (correct client IPs)

  app.use(
    helmet({
      // Allow the PWA/service worker & inline styles produced by Vite.
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              manifestSrc: ["'self'"],
              fontSrc: ["'self'", 'data:'],
            },
          }
        : false,
    }),
  );

  if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins, credentials: true }));
  }

  if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use(express.json({ limit: '256kb' }));

  // Basic API rate limiting.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
    }),
  );

  app.use('/api', apiRouter);

  // Serve the compiled client in production (or whenever a build exists).
  if (fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        setHeaders: (res, filePath) => {
          // Never cache the HTML shell or the service worker aggressively.
          if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (/\.[0-9a-f]{8,}\./.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    // SPA fallback: any non-API GET returns index.html.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
