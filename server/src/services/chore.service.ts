// Chore template management (with embedded recurrence + default assignment).

import { prisma } from '../config/prisma.js';
import { getHousehold } from './household.service.js';
import { badRequest, notFound } from '../utils/http-error.js';
import { localDateToUtcMidnight } from '../../../shared/dates.js';
import { ruleToDTO } from './mappers.js';
import type { ChoreTemplateDTO } from '../../../shared/types.js';
import type { z } from 'zod';
import type {
  createChoreSchema,
  updateChoreSchema,
} from '../validation/schemas.js';

type ChoreWithRule = Awaited<ReturnType<typeof loadTemplate>>;

async function loadTemplate(id: string) {
  return prisma.choreTemplate.findUnique({
    where: { id },
    include: {
      recurrenceRules: {
        where: { isActive: true },
        include: { assignmentRules: { orderBy: { effectiveFrom: 'asc' } } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
}

function toDTO(t: NonNullable<ChoreWithRule>): ChoreTemplateDTO {
  const rule = t.recurrenceRules[0] ?? null;
  const openRule =
    rule?.assignmentRules.find((a) => a.effectiveUntil == null) ??
    rule?.assignmentRules[rule.assignmentRules.length - 1] ??
    null;
  return {
    id: t.id,
    categoryId: t.categoryId,
    name: t.name,
    description: t.description,
    defaultTime: t.defaultTime,
    timeSlotLabel: t.timeSlotLabel,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    isMeal: t.isMeal,
    mealType: t.mealType,
    recurrence: rule ? ruleToDTO(rule) : null,
    defaultMemberId: openRule?.familyMemberId ?? null,
  };
}

export async function listChores(includeInactive = true) {
  const household = await getHousehold();
  const templates = await prisma.choreTemplate.findMany({
    where: {
      householdId: household.id,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      recurrenceRules: {
        where: { isActive: true },
        include: { assignmentRules: { orderBy: { effectiveFrom: 'asc' } } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  return templates.map((t) => toDTO(t));
}

export async function getChore(id: string) {
  const t = await loadTemplate(id);
  if (!t) throw notFound('Chore not found');
  return toDTO(t);
}

export async function createChore(input: z.infer<typeof createChoreSchema>) {
  const household = await getHousehold();

  const category = await prisma.choreCategory.findFirst({
    where: { id: input.categoryId, householdId: household.id },
  });
  if (!category) throw badRequest('Category does not exist');

  if (input.isMeal && !input.mealType) {
    throw badRequest('mealType is required for meal chores');
  }

  const max = await prisma.choreTemplate.aggregate({
    where: { householdId: household.id },
    _max: { sortOrder: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    const template = await tx.choreTemplate.create({
      data: {
        householdId: household.id,
        categoryId: input.categoryId,
        name: input.name.trim(),
        description: input.description ?? null,
        defaultTime: input.defaultTime ?? null,
        timeSlotLabel: input.timeSlotLabel ?? null,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        isActive: input.isActive ?? true,
        isMeal: input.isMeal ?? false,
        mealType: input.mealType ?? null,
      },
    });

    const rule = await tx.recurrenceRule.create({
      data: {
        choreTemplateId: template.id,
        frequency: input.recurrence.frequency,
        interval: input.recurrence.interval,
        daysOfWeek: input.recurrence.daysOfWeek,
        startDate: localDateToUtcMidnight(input.recurrence.startDate),
        endDate: input.recurrence.endDate
          ? localDateToUtcMidnight(input.recurrence.endDate)
          : null,
        time: input.recurrence.time ?? input.defaultTime ?? null,
        timezone: household.timezone,
      },
    });

    if (input.defaultMemberId) {
      await tx.assignmentRule.create({
        data: {
          recurrenceRuleId: rule.id,
          familyMemberId: input.defaultMemberId,
          effectiveFrom: localDateToUtcMidnight(input.recurrence.startDate),
        },
      });
    }

    return template.id;
  });

  return getChore(created);
}

export async function updateChore(
  id: string,
  input: z.infer<typeof updateChoreSchema>,
) {
  const existing = await loadTemplate(id);
  if (!existing) throw notFound('Chore not found');
  const rule = existing.recurrenceRules[0] ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.choreTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
        ...(input.defaultTime !== undefined
          ? { defaultTime: input.defaultTime ?? null }
          : {}),
        ...(input.timeSlotLabel !== undefined
          ? { timeSlotLabel: input.timeSlotLabel ?? null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });

    if (input.recurrence && rule) {
      await tx.recurrenceRule.update({
        where: { id: rule.id },
        data: {
          ...(input.recurrence.frequency !== undefined
            ? { frequency: input.recurrence.frequency }
            : {}),
          ...(input.recurrence.interval !== undefined
            ? { interval: input.recurrence.interval }
            : {}),
          ...(input.recurrence.daysOfWeek !== undefined
            ? { daysOfWeek: input.recurrence.daysOfWeek }
            : {}),
          ...(input.recurrence.startDate !== undefined
            ? { startDate: localDateToUtcMidnight(input.recurrence.startDate) }
            : {}),
          ...(input.recurrence.endDate !== undefined
            ? {
                endDate: input.recurrence.endDate
                  ? localDateToUtcMidnight(input.recurrence.endDate)
                  : null,
              }
            : {}),
          ...(input.recurrence.time !== undefined
            ? { time: input.recurrence.time ?? null }
            : {}),
        },
      });
    }

    if (input.defaultMemberId !== undefined && rule) {
      // Reset the default assignment to a single open-ended rule.
      await tx.assignmentRule.deleteMany({ where: { recurrenceRuleId: rule.id } });
      if (input.defaultMemberId) {
        await tx.assignmentRule.create({
          data: {
            recurrenceRuleId: rule.id,
            familyMemberId: input.defaultMemberId,
            effectiveFrom: rule.startDate,
          },
        });
      }
    }
  });

  return getChore(id);
}

/**
 * "Delete" a chore. If it has any history (overrides/completions/meals), we
 * deactivate instead of hard-deleting to preserve records.
 */
export async function deleteChore(id: string) {
  const existing = await prisma.choreTemplate.findUnique({ where: { id } });
  if (!existing) throw notFound('Chore not found');

  const [overrides, completions, meals] = await Promise.all([
    prisma.choreOccurrenceOverride.count({ where: { choreTemplateId: id } }),
    prisma.choreCompletion.count({ where: { choreTemplateId: id } }),
    prisma.mealPlan.count({ where: { choreTemplateId: id } }),
  ]);
  const hasHistory = overrides + completions + meals > 0;

  if (hasHistory) {
    await prisma.choreTemplate.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, deactivated: true };
  }

  await prisma.choreTemplate.delete({ where: { id } });
  return { deleted: true, deactivated: false };
}
