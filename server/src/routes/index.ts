import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { prisma } from '../config/prisma.js';
import { getHousehold } from '../services/household.service.js';
import { membersRouter } from './members.routes.js';
import { categoriesRouter } from './categories.routes.js';
import { choresRouter } from './chores.routes.js';
import { scheduleRouter } from './schedule.routes.js';
import type { ConfigDTO } from '../../../shared/types.js';

export const apiRouter = Router();

// Liveness check for the platform healthcheck. Always returns 200 when the
// process is up (a running app should pass the deploy healthcheck even if the
// database has a transient hiccup); the DB status is reported in the body.
apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let db = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    res.status(200).json({
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      time: new Date().toISOString(),
    });
  }),
);

apiRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    const h = await getHousehold();
    const config: ConfigDTO = {
      householdId: h.id,
      householdName: h.name,
      timezone: h.timezone,
      weekStartsOn: h.weekStartsOn,
    };
    res.json(config);
  }),
);

apiRouter.use('/members', membersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/chores', choresRouter);
apiRouter.use('/', scheduleRouter);
