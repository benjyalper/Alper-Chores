// Server entry point. Binds to 0.0.0.0 and the Railway-provided PORT.

import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma, prisma } from './config/prisma.js';

async function main() {
  // Verify DB connectivity early with a clear message.
  try {
    await prisma.$connect();
  } catch (err) {
    console.error(
      '✖ Could not connect to PostgreSQL. Check DATABASE_URL.\n',
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `✔ Alper Chores server listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`,
    );
  });

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
