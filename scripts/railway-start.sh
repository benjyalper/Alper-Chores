#!/bin/sh
# Railway (and any container) start script.
#
# We run database migrations + seed in the BACKGROUND and start the web server
# in the FOREGROUND immediately. That way the HTTP server binds and /api/health
# responds within a second or two and the platform healthcheck passes, even if
# the database is briefly unreachable on a fresh deploy. Migrations still apply
# in the background once the DB is reachable (and again on the next deploy).
#
# Invoked via `sh scripts/railway-start.sh` so the platform's start-command
# parser never has to understand shell operators like `&`.

(
  npx prisma migrate deploy \
    && ( timeout 120 npx prisma db seed || echo 'seed skipped (non-fatal)' ) \
    || echo 'migrate/seed deferred — will retry on next deploy'
) &

# Replace this shell with the Node server so it receives signals directly
# (graceful shutdown) and becomes the container's main process.
exec npm run start
