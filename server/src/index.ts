// Server entry point. Binds to 0.0.0.0 and the Railway-provided PORT.

import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma, prisma } from './config/prisma.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect to PostgreSQL with a short backoff. We do NOT block server startup on
 * this: the HTTP server starts listening immediately so the platform healthcheck
 * passes, and Prisma also connects lazily on first query. This avoids a
 * crash-loop if the database is a few seconds slower to become reachable than
 * the app on a fresh deploy.
 */
async function connectWithRetry(attempts = 10, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$connect();
      console.log('✔ Connected to PostgreSQL');
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Database connection attempt ${i}/${attempts} failed: ${msg}`);
      if (i < attempts) await sleep(delayMs);
    }
  }
  console.error(
    '✖ Could not connect to PostgreSQL after retries. The server is up and ' +
      '/api/health responds, but data requests will fail until DATABASE_URL is reachable.',
  );
}

async function main() {
  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `✔ Alper Chores server listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  // Establish the DB connection in the background (non-blocking).
  void connectWithRetry();

  // Graceful shutdown.
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    // Force-exit if it hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
