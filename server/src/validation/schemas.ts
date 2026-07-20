// Zod request-validation schemas for the API.

import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)');

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be a time (HH:mm)');

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Must be a hex color like #4F86C6');

// Allow http(s) URLs only; reject javascript: etc.
const safeUrl = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine((u) => /^https?:\/\//i.test(u), 'Only http:// and https:// URLs are allowed');

export const frequencyEnum = z.enum(['ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_WEEKLY']);
export const completionStatusEnum = z.enum(['PENDING', 'COMPLETED', 'SKIPPED']);
export const mealTypeEnum = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);
export const mealPlanTypeEnum = z.enum([
  'HOME_COOKED',
  'RESTAURANT',
  'TAKEOUT',
  'LEFTOVERS',
  'OTHER',
]);
export const assignmentScopeEnum = z.enum([
  'occurrence',
  'rest-of-week',
  'this-and-future',
  'entire-series',
]);
export const editScopeEnum = z.enum(['occurrence', 'this-and-future', 'entire-series']);
export const deleteScopeEnum = z.enum(['occurrence', 'this-and-future']);

// ---- Members ---------------------------------------------------------------

export const createMemberSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  color: hexColor.nullish(),
  emoji: z.string().trim().max(8).nullish(),
});

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColor.nullish(),
    emoji: z.string().trim().max(8).nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'No fields to update');

export const deactivateMemberSchema = z.object({
  // What to do with this member's future default assignments.
  futureAssignments: z
    .enum(['leave', 'clear', 'transfer'])
    .default('leave'),
  transferToMemberId: z.string().optional(),
});

// ---- Categories ------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().optional(),
  isMealCategory: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'No fields to update');

// ---- Recurrence (embedded in chore create/update) --------------------------

export const recurrenceSchema = z.object({
  frequency: frequencyEnum,
  interval: z.number().int().min(1).max(52).default(1),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  time: hhmm.nullish(),
});

// ---- Chore templates -------------------------------------------------------

export const createChoreSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  categoryId: z.string().min(1),
  description: z.string().trim().max(500).nullish(),
  defaultTime: hhmm.nullish(),
  timeSlotLabel: z.string().trim().max(30).nullish(),
  isMeal: z.boolean().optional(),
  mealType: mealTypeEnum.nullish(),
  isActive: z.boolean().optional(),
  recurrence: recurrenceSchema,
  defaultMemberId: z.string().nullish(),
});

export const updateChoreSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    categoryId: z.string().min(1).optional(),
    description: z.string().trim().max(500).nullish(),
    defaultTime: hhmm.nullish(),
    timeSlotLabel: z.string().trim().max(30).nullish(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    recurrence: recurrenceSchema.partial().optional(),
    defaultMemberId: z.string().nullish(),
  })
  .refine((o) => Object.keys(o).length > 0, 'No fields to update');

// ---- Schedule / occurrence operations --------------------------------------

export const weekQuerySchema = z.object({
  weekStart: isoDate.optional(),
});

export const assignmentSchema = z.object({
  memberId: z.string().nullable(),
  scope: assignmentScopeEnum.default('occurrence'),
});

export const statusSchema = z.object({
  status: completionStatusEnum,
  completedByMemberId: z.string().nullish(),
  note: z.string().trim().max(300).nullish(),
});

export const deleteSchema = z.object({
  scope: deleteScopeEnum.default('occurrence'),
});

export const occurrenceEditSchema = z.object({
  scope: editScopeEnum.default('occurrence'),
  name: z.string().trim().min(1).max(80).nullish(),
  time: hhmm.nullish(),
  notes: z.string().trim().max(500).nullish(),
  isCancelled: z.boolean().optional(),
});

export const mealSchema = z.object({
  planType: mealPlanTypeEnum.nullish(),
  assignedMemberId: z.string().nullish(),
  description: z.string().trim().max(300).nullish(),
  recipeUrl: safeUrl.nullish().or(z.literal('')),
  restaurantName: z.string().trim().max(120).nullish(),
  restaurantUrl: safeUrl.nullish().or(z.literal('')),
  takeoutProvider: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(300).nullish(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type MealInput = z.infer<typeof mealSchema>;
export type OccurrenceEditInput = z.infer<typeof occurrenceEditSchema>;
export type DeleteInput = z.infer<typeof deleteSchema>;
