import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { parseBody } from '../middleware/validate.js';
import {
  createMemberSchema,
  updateMemberSchema,
  deactivateMemberSchema,
} from '../validation/schemas.js';
import * as members from '../services/member.service.js';

export const membersRouter = Router();

membersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    res.json(await members.listMembers(includeInactive));
  }),
);

membersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const force = req.query.force === 'true';
    const input = parseBody(createMemberSchema, req.body);
    res.status(201).json(await members.createMember(input, { force }));
  }),
);

membersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(updateMemberSchema, req.body);
    res.json(await members.updateMember(req.params.id, input));
  }),
);

membersRouter.get(
  '/:id/future-assignments',
  asyncHandler(async (req, res) => {
    res.json({ count: await members.futureAssignmentCount(req.params.id) });
  }),
);

membersRouter.post(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const input = parseBody(deactivateMemberSchema, req.body ?? {});
    res.json(await members.deactivateMember(req.params.id, input));
  }),
);

membersRouter.post(
  '/:id/reactivate',
  asyncHandler(async (req, res) => {
    res.json(await members.reactivateMember(req.params.id));
  }),
);
