// Mutations against a single logical occurrence: assignment, completion status,
// occurrence edits, and meal plans. Recurrence-aware scopes are applied inside
// transactions so a series update never leaves partial state.

import { prisma } from '../config/prisma.js';
import { HttpError, badRequest, notFound } from '../utils/http-error.js';
import {
  addLocalDays,
  localDateToUtcMidnight,
  startOfWeekMonday,
  utcMidnightToLocalDate,
  weekDates,
} from '../../../shared/dates.js';
import { parseOccurrenceKey, ruleFiresOn } from '../../../shared/recurrence.js';
import { ruleToInput } from './mappers.js';
import type {
  AssignmentInput,
  MealInput,
  OccurrenceEditInput,
  StatusInput,
} from '../validation/schemas.js';

async function loadOccurrenceTemplate(occurrenceKey: string) {
  const parsed = parseOccurrenceKey(occurrenceKey);
  if (!parsed) throw badRequest('Invalid occurrence key');
  const template = await prisma.choreTemplate.findUnique({
    where: { id: parsed.templateId },
    include: {
      recurrenceRules: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!template) throw notFound('Chore not found');
  return { template, date: parsed.date, rule: template.recurrenceRules[0] ?? null };
}

async function assertMemberActive(memberId: string | null) {
  if (!memberId) return;
  const m = await prisma.familyMember.findUnique({ where: { id: memberId } });
  if (!m) throw badRequest('Assigned member does not exist');
  if (!m.isActive) throw badRequest('Cannot assign an inactive member');
}

// ---- Assignment ------------------------------------------------------------

export async function setAssignment(occurrenceKey: string, input: AssignmentInput) {
  const { template, date, rule } = await loadOccurrenceTemplate(occurrenceKey);
  await assertMemberActive(input.memberId);

  return prisma.$transaction(async (tx) => {
    const upsertOverride = (localDate: string) =>
      tx.choreOccurrenceOverride.upsert({
        where: {
          choreTemplateId_occurrenceDate: {
            choreTemplateId: template.id,
            occurrenceDate: localDateToUtcMidnight(localDate),
          },
        },
        create: {
          choreTemplateId: template.id,
          occurrenceDate: localDateToUtcMidnight(localDate),
          recurrenceRuleId: rule?.id ?? null,
          assignedMemberId: input.memberId,
          hasAssignment: true,
        },
        update: { assignedMemberId: input.memberId, hasAssignment: true },
      });

    switch (input.scope) {
      case 'occurrence':
        await upsertOverride(date);
        break;

      case 'rest-of-week': {
        const week = weekDates(startOfWeekMonday(date));
        const targets = week.filter(
          (d) => d >= date && (!rule || ruleFiresOn(ruleToInput(rule), d)),
        );
        // Always include the clicked date even for one-off templates.
        if (!targets.includes(date)) targets.push(date);
        for (const d of targets) await upsertOverride(d);
        break;
      }

      case 'this-and-future': {
        if (!rule) throw badRequest('This chore is not recurring');
        // Close open assignment rules, add a new default from this date.
        await tx.assignmentRule.updateMany({
          where: { recurrenceRuleId: rule.id, effectiveUntil: null },
          data: { effectiveUntil: localDateToUtcMidnight(addLocalDays(date, -1)) },
        });
        await tx.assignmentRule.create({
          data: {
            recurrenceRuleId: rule.id,
            familyMemberId: input.memberId,
            effectiveFrom: localDateToUtcMidnight(date),
          },
        });
        // Clear per-date assignment overrides on/after this date so the rule wins.
        await tx.choreOccurrenceOverride.updateMany({
          where: {
            choreTemplateId: template.id,
            occurrenceDate: { gte: localDateToUtcMidnight(date) },
            hasAssignment: true,
          },
          data: { hasAssignment: false, assignedMemberId: null },
        });
        break;
      }

      case 'entire-series': {
        if (!rule) throw badRequest('This chore is not recurring');
        await tx.assignmentRule.deleteMany({ where: { recurrenceRuleId: rule.id } });
        await tx.assignmentRule.create({
          data: {
            recurrenceRuleId: rule.id,
            familyMemberId: input.memberId,
            effectiveFrom: rule.startDate,
          },
        });
        await tx.choreOccurrenceOverride.updateMany({
          where: { choreTemplateId: template.id, hasAssignment: true },
          data: { hasAssignment: false, assignedMemberId: null },
        });
        break;
      }
    }

    return { ok: true, occurrenceKey, memberId: input.memberId, scope: input.scope };
  });
}

// ---- Completion status -----------------------------------------------------

export async function setStatus(occurrenceKey: string, input: StatusInput) {
  const { template, date } = await loadOccurrenceTemplate(occurrenceKey);
  if (input.completedByMemberId) await assertMemberActive(input.completedByMemberId);

  const completedAt = input.status === 'COMPLETED' ? new Date() : null;
  const row = await prisma.choreCompletion.upsert({
    where: {
      choreTemplateId_occurrenceDate: {
        choreTemplateId: template.id,
        occurrenceDate: localDateToUtcMidnight(date),
      },
    },
    create: {
      choreTemplateId: template.id,
      occurrenceDate: localDateToUtcMidnight(date),
      status: input.status,
      completedAt,
      completedByMemberId: input.completedByMemberId ?? null,
      note: input.note ?? null,
    },
    update: {
      status: input.status,
      completedAt,
      completedByMemberId: input.completedByMemberId ?? null,
      note: input.note ?? null,
    },
  });
  return {
    occurrenceKey,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

// ---- Occurrence edit (name/time/notes/cancel) ------------------------------

export async function editOccurrence(
  occurrenceKey: string,
  input: OccurrenceEditInput,
) {
  const { template, date, rule } = await loadOccurrenceTemplate(occurrenceKey);

  if (input.scope === 'entire-series' || input.scope === 'this-and-future') {
    // Apply name/time changes to the template/rule level.
    return prisma.$transaction(async (tx) => {
      if (input.name != null || input.time != null) {
        await tx.choreTemplate.update({
          where: { id: template.id },
          data: {
            ...(input.name != null ? { name: input.name } : {}),
            ...(input.time != null ? { defaultTime: input.time } : {}),
          },
        });
        if (rule && input.time != null) {
          await tx.recurrenceRule.update({
            where: { id: rule.id },
            data: { time: input.time },
          });
        }
      }
      if (input.isCancelled) {
        // Cancel from this date forward by ending the recurrence rule.
        if (rule && input.scope === 'this-and-future') {
          await tx.recurrenceRule.update({
            where: { id: rule.id },
            data: { endDate: localDateToUtcMidnight(addLocalDays(date, -1)) },
          });
        } else {
          await tx.choreTemplate.update({
            where: { id: template.id },
            data: { isActive: false },
          });
        }
      }
      return { ok: true, occurrenceKey, scope: input.scope };
    });
  }

  // occurrence scope -> upsert an override for this date only.
  await prisma.choreOccurrenceOverride.upsert({
    where: {
      choreTemplateId_occurrenceDate: {
        choreTemplateId: template.id,
        occurrenceDate: localDateToUtcMidnight(date),
      },
    },
    create: {
      choreTemplateId: template.id,
      occurrenceDate: localDateToUtcMidnight(date),
      recurrenceRuleId: rule?.id ?? null,
      nameOverride: input.name ?? null,
      timeOverride: input.time ?? null,
      notes: input.notes ?? null,
      isCancelled: input.isCancelled ?? false,
    },
    update: {
      ...(input.name !== undefined ? { nameOverride: input.name } : {}),
      ...(input.time !== undefined ? { timeOverride: input.time } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isCancelled !== undefined ? { isCancelled: input.isCancelled } : {}),
    },
  });
  return { ok: true, occurrenceKey, scope: input.scope };
}

// ---- Meal plan -------------------------------------------------------------

export async function getMeal(occurrenceKey: string) {
  const { template, date } = await loadOccurrenceTemplate(occurrenceKey);
  if (!template.isMeal) throw badRequest('This chore is not a meal');
  const row = await prisma.mealPlan.findUnique({
    where: {
      choreTemplateId_occurrenceDate: {
        choreTemplateId: template.id,
        occurrenceDate: localDateToUtcMidnight(date),
      },
    },
  });
  return {
    occurrenceKey,
    mealType: template.mealType,
    planType: row?.planType ?? null,
    assignedMemberId: row?.assignedMemberId ?? null,
    description: row?.description ?? null,
    recipeUrl: row?.recipeUrl ?? null,
    restaurantName: row?.restaurantName ?? null,
    restaurantUrl: row?.restaurantUrl ?? null,
    takeoutProvider: row?.takeoutProvider ?? null,
    notes: row?.notes ?? null,
  };
}

const emptyToNull = (v: string | null | undefined) =>
  v == null || v === '' ? null : v;

export async function setMeal(occurrenceKey: string, input: MealInput) {
  const { template, date, rule } = await loadOccurrenceTemplate(occurrenceKey);
  if (!template.isMeal || !template.mealType) {
    throw badRequest('This chore is not a meal');
  }
  if (input.assignedMemberId) await assertMemberActive(input.assignedMemberId);

  const data = {
    planType: input.planType ?? null,
    assignedMemberId: input.assignedMemberId ?? null,
    description: emptyToNull(input.description),
    recipeUrl: emptyToNull(input.recipeUrl),
    restaurantName: emptyToNull(input.restaurantName),
    restaurantUrl: emptyToNull(input.restaurantUrl),
    takeoutProvider: emptyToNull(input.takeoutProvider),
    notes: emptyToNull(input.notes),
  };

  const row = await prisma.mealPlan.upsert({
    where: {
      choreTemplateId_occurrenceDate: {
        choreTemplateId: template.id,
        occurrenceDate: localDateToUtcMidnight(date),
      },
    },
    create: {
      choreTemplateId: template.id,
      occurrenceDate: localDateToUtcMidnight(date),
      recurrenceRuleId: rule?.id ?? null,
      mealType: template.mealType,
      ...data,
    },
    update: data,
  });
  return { occurrenceKey, ...data, mealType: row.mealType };
}

export { utcMidnightToLocalDate, HttpError };
