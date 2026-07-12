// Chore category management.

import { prisma } from '../config/prisma.js';
import { getHousehold } from './household.service.js';
import { notFound } from '../utils/http-error.js';
import { categoryToDTO } from './mappers.js';
import type { z } from 'zod';
import type {
  createCategorySchema,
  updateCategorySchema,
} from '../validation/schemas.js';

export async function listCategories() {
  const household = await getHousehold();
  const categories = await prisma.choreCategory.findMany({
    where: { householdId: household.id },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return categories.map(categoryToDTO);
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const household = await getHousehold();
  const max = await prisma.choreCategory.aggregate({
    where: { householdId: household.id },
    _max: { sortOrder: true },
  });
  const category = await prisma.choreCategory.create({
    data: {
      householdId: household.id,
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      isMealCategory: input.isMealCategory ?? false,
    },
  });
  return categoryToDTO(category);
}

export async function updateCategory(
  id: string,
  input: z.infer<typeof updateCategorySchema>,
) {
  const existing = await prisma.choreCategory.findUnique({ where: { id } });
  if (!existing) throw notFound('Category not found');
  const category = await prisma.choreCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return categoryToDTO(category);
}
