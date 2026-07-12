import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { parseBody } from '../middleware/validate.js';
import { createChoreSchema, updateChoreSchema } from '../validation/schemas.js';
import * as chores from '../services/chore.service.js';

export const choresRouter = Router();

choresRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    res.json(await chores.listChores(includeInactive));
  }),
);

choresRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createChoreSchema, req.body);
    res.status(201).json(await chores.createChore(input));
  }),
);

choresRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await chores.getChore(req.params.id));
  }),
);

choresRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(updateChoreSchema, req.body);
    res.json(await chores.updateChore(req.params.id, input));
  }),
);

choresRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await chores.deleteChore(req.params.id));
  }),
);
