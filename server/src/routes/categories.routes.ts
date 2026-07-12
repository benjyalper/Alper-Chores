import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { parseBody } from '../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validation/schemas.js';
import * as categories from '../services/category.service.js';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await categories.listCategories());
  }),
);

categoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createCategorySchema, req.body);
    res.status(201).json(await categories.createCategory(input));
  }),
);

categoriesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(updateCategorySchema, req.body);
    res.json(await categories.updateCategory(req.params.id, input));
  }),
);
