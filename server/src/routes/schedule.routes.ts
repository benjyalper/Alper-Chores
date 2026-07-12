import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { parseBody, parseQuery } from '../middleware/validate.js';
import {
  assignmentSchema,
  mealSchema,
  occurrenceEditSchema,
  statusSchema,
  weekQuerySchema,
} from '../validation/schemas.js';
import { getWeeklySchedule } from '../services/schedule.service.js';
import * as occ from '../services/occurrence.service.js';

export const scheduleRouter = Router();

// GET /api/schedule?weekStart=YYYY-MM-DD
scheduleRouter.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const { weekStart } = parseQuery(weekQuerySchema, req.query);
    res.json(await getWeeklySchedule(weekStart));
  }),
);

// Occurrence-scoped mutations. occurrenceKey = `${templateId}__${date}`.
scheduleRouter.put(
  '/occurrences/:occurrenceKey/assignment',
  asyncHandler(async (req, res) => {
    const input = parseBody(assignmentSchema, req.body);
    res.json(await occ.setAssignment(req.params.occurrenceKey, input));
  }),
);

scheduleRouter.put(
  '/occurrences/:occurrenceKey/status',
  asyncHandler(async (req, res) => {
    const input = parseBody(statusSchema, req.body);
    res.json(await occ.setStatus(req.params.occurrenceKey, input));
  }),
);

scheduleRouter.patch(
  '/occurrences/:occurrenceKey',
  asyncHandler(async (req, res) => {
    const input = parseBody(occurrenceEditSchema, req.body);
    res.json(await occ.editOccurrence(req.params.occurrenceKey, input));
  }),
);

scheduleRouter.get(
  '/occurrences/:occurrenceKey/meal',
  asyncHandler(async (req, res) => {
    res.json(await occ.getMeal(req.params.occurrenceKey));
  }),
);

scheduleRouter.put(
  '/occurrences/:occurrenceKey/meal',
  asyncHandler(async (req, res) => {
    const input = parseBody(mealSchema, req.body);
    res.json(await occ.setMeal(req.params.occurrenceKey, input));
  }),
);
