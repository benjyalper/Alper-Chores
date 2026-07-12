// Weekly schedule assembly. Fetches everything needed for a week in a small,
// fixed number of queries and runs the pure recurrence engine to produce the
// normalized WeeklyScheduleDTO.

import { prisma } from '../config/prisma.js';
import { getHousehold } from './household.service.js';
import { env } from '../config/env.js';
import {
  addLocalDays,
  isoWeekday,
  localDateToUtcMidnight,
  startOfWeek,
  todayLocalDate,
  utcMidnightToLocalDate,
  weekDates,
} from '../../../shared/dates.js';
import {
  occurrenceKey,
  resolveTemplateOccurrences,
  type AssignmentRuleInput,
  type CompletionInput,
  type MealInput,
  type OverrideInput,
  type ResolveContext,
  type TemplateInput,
} from '../../../shared/recurrence.js';
import type {
  OccurrenceDTO,
  ScheduleDayDTO,
  WeeklyScheduleDTO,
} from '../../../shared/types.js';
import { memberToDTO, categoryToDTO, ruleToInput } from './mappers.js';

export async function getWeeklySchedule(
  weekStartParam?: string,
): Promise<WeeklyScheduleDTO> {
  const household = await getHousehold();
  const tz = household.timezone || env.HOUSEHOLD_TIMEZONE;

  const weekStartsOn = household.weekStartsOn;
  const today = todayLocalDate(tz);
  const weekStart = startOfWeek(weekStartParam ?? today, weekStartsOn);
  const dates = weekDates(weekStart, weekStartsOn);
  const weekEnd = dates[6];

  const rangeStart = localDateToUtcMidnight(weekStart);
  const rangeEnd = localDateToUtcMidnight(weekEnd);

  // ---- Batched queries (no per-cell requests) ----
  const [members, categories, templates, overrides, completions, meals] =
    await Promise.all([
      prisma.familyMember.findMany({
        where: { householdId: household.id },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.choreCategory.findMany({
        where: { householdId: household.id },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.choreTemplate.findMany({
        where: { householdId: household.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          recurrenceRules: {
            where: { isActive: true },
            include: { assignmentRules: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.choreOccurrenceOverride.findMany({
        where: { occurrenceDate: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.choreCompletion.findMany({
        where: { occurrenceDate: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.mealPlan.findMany({
        where: { occurrenceDate: { gte: rangeStart, lte: rangeEnd } },
      }),
    ]);

  // Index dated rows by templateId + local date for O(1) lookup.
  const overrideMap = new Map<string, OverrideInput>();
  for (const o of overrides) {
    overrideMap.set(occurrenceKey(o.choreTemplateId, utcMidnightToLocalDate(o.occurrenceDate)), {
      occurrenceDate: utcMidnightToLocalDate(o.occurrenceDate),
      assignedMemberId: o.assignedMemberId,
      hasAssignment: o.hasAssignment,
      nameOverride: o.nameOverride,
      timeOverride: o.timeOverride,
      isCancelled: o.isCancelled,
      notes: o.notes,
    });
  }

  const completionMap = new Map<string, CompletionInput>();
  for (const c of completions) {
    completionMap.set(occurrenceKey(c.choreTemplateId, utcMidnightToLocalDate(c.occurrenceDate)), {
      occurrenceDate: utcMidnightToLocalDate(c.occurrenceDate),
      status: c.status,
      completedAt: c.completedAt ? c.completedAt.toISOString() : null,
      completedByMemberId: c.completedByMemberId,
      note: c.note,
    });
  }

  const mealMap = new Map<string, MealInput>();
  for (const m of meals) {
    mealMap.set(occurrenceKey(m.choreTemplateId, utcMidnightToLocalDate(m.occurrenceDate)), {
      occurrenceDate: utcMidnightToLocalDate(m.occurrenceDate),
      planType: m.planType,
      assignedMemberId: m.assignedMemberId,
      description: m.description,
      recipeUrl: m.recipeUrl,
      restaurantName: m.restaurantName,
    });
  }

  // Accumulate occurrences per day.
  const dayOccurrences = new Map<string, OccurrenceDTO[]>();
  for (const d of dates) dayOccurrences.set(d, []);

  for (const t of templates) {
    const rule = t.recurrenceRules[0] ?? null;

    const templateInput: TemplateInput = {
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
      rule: rule ? ruleToInput(rule) : null,
    };

    const assignmentRules: AssignmentRuleInput[] = (rule?.assignmentRules ?? []).map(
      (a) => ({
        familyMemberId: a.familyMemberId,
        effectiveFrom: utcMidnightToLocalDate(a.effectiveFrom),
        effectiveUntil: a.effectiveUntil ? utcMidnightToLocalDate(a.effectiveUntil) : null,
      }),
    );

    // Per-template maps keyed by bare date (engine expects date-keyed maps).
    const overridesByDate = new Map<string, OverrideInput>();
    const completionsByDate = new Map<string, CompletionInput>();
    const mealsByDate = new Map<string, MealInput>();
    for (const d of dates) {
      const key = occurrenceKey(t.id, d);
      const ov = overrideMap.get(key);
      if (ov) overridesByDate.set(d, ov);
      const co = completionMap.get(key);
      if (co) completionsByDate.set(d, co);
      const me = mealMap.get(key);
      if (me) mealsByDate.set(d, me);
    }

    const ctx: ResolveContext = {
      template: templateInput,
      assignmentRules,
      overridesByDate,
      completionsByDate,
      mealsByDate,
    };

    const resolved = resolveTemplateOccurrences(ctx, dates);
    for (const r of resolved) {
      const dto: OccurrenceDTO = {
        occurrenceKey: occurrenceKey(r.templateId, r.date),
        templateId: r.templateId,
        categoryId: r.categoryId,
        name: r.name,
        description: r.description,
        date: r.date,
        time: r.time,
        timeSlotLabel: r.timeSlotLabel,
        isMeal: r.isMeal,
        mealType: r.mealType,
        assignedMemberId: r.assignedMemberId,
        status: r.status,
        completedAt: r.completedAt,
        completedByMemberId: r.completedByMemberId,
        completionNote: r.completionNote,
        isRecurring: r.isRecurring,
        frequency: r.frequency,
        hasNotes: !!(r.notes && r.notes.trim()),
        notes: r.notes,
        mealSummary: r.isMeal
          ? {
              planType: r.meal?.planType ?? null,
              description: r.meal?.description ?? null,
              hasRecipe: !!r.meal?.recipeUrl,
              hasRestaurant: !!r.meal?.restaurantName,
            }
          : null,
      };
      dayOccurrences.get(r.date)!.push(dto);
    }
  }

  // Sort each day's occurrences by time then name.
  const days: ScheduleDayDTO[] = dates.map((date) => {
    const occ = dayOccurrences.get(date)!;
    occ.sort((a, b) => {
      const ta = a.time ?? '99:99';
      const tb = b.time ?? '99:99';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const completedCount = occ.filter((o) => o.status === 'COMPLETED').length;
    return {
      date,
      weekday: isoWeekday(date),
      isToday: date === today,
      occurrences: occ,
      completedCount,
      totalCount: occ.length,
    };
  });

  const currentWeekStart = startOfWeek(today, weekStartsOn);

  return {
    weekStart,
    weekEnd,
    timezone: tz,
    isCurrentWeek: weekStart === currentWeekStart,
    isPastWeek: weekStart < currentWeekStart,
    isFutureWeek: weekStart > currentWeekStart,
    members: members.map(memberToDTO),
    categories: categories.map(categoryToDTO),
    days,
  };
}

// Re-export for convenience elsewhere.
export { addLocalDays };
