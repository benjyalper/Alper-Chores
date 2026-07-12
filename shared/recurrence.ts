// Recurrence resolution engine (pure, DB-free, unit-testable).
//
// Given chore templates + their recurrence rules + dated overrides + completion
// rows + meal rows + assignment rules, produce the concrete occurrences for a
// set of local dates. This is the single source of truth for "what chores
// happen this week". See README "Recurrence model" for the algorithm.

import type {
  CompletionStatus,
  Frequency,
  MealPlanType,
  MealType,
} from './types';
import { daysBetween, isoWeekday, weeksBetween } from './dates';

export function occurrenceKey(templateId: string, localDate: string): string {
  return `${templateId}__${localDate}`;
}

export function parseOccurrenceKey(
  key: string,
): { templateId: string; date: string } | null {
  const idx = key.lastIndexOf('__');
  if (idx <= 0) return null;
  const templateId = key.slice(0, idx);
  const date = key.slice(idx + 2);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Reject impossible calendar dates (e.g. 2026-13-40) by round-tripping.
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return null;
  }
  return { templateId, date };
}

// ---- Plain input shapes (mapped from Prisma rows) --------------------------

export interface RuleInput {
  id: string;
  frequency: Frequency;
  interval: number;
  daysOfWeek: number[]; // 1..7 ISO; empty => derive from startDate weekday
  startDate: string; // local ISO date
  endDate: string | null;
  time: string | null;
  isActive: boolean;
}

export interface TemplateInput {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  defaultTime: string | null;
  timeSlotLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  isMeal: boolean;
  mealType: MealType | null;
  rule: RuleInput | null;
}

export interface AssignmentRuleInput {
  familyMemberId: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface OverrideInput {
  occurrenceDate: string;
  assignedMemberId: string | null;
  hasAssignment: boolean;
  nameOverride: string | null;
  timeOverride: string | null;
  isCancelled: boolean;
  notes: string | null;
}

export interface CompletionInput {
  occurrenceDate: string;
  status: CompletionStatus;
  completedAt: string | null;
  completedByMemberId: string | null;
  note: string | null;
}

export interface MealInput {
  occurrenceDate: string;
  planType: MealPlanType | null;
  assignedMemberId: string | null;
  description: string | null;
  recipeUrl: string | null;
  restaurantName: string | null;
}

/**
 * Does `rule` fire on the given local date?
 * Pure calendar logic — no timezone conversions needed because everything is
 * already expressed as local ISO dates.
 */
export function ruleFiresOn(rule: RuleInput, localDate: string): boolean {
  if (!rule.isActive) return false;
  if (localDate < rule.startDate) return false;
  if (rule.endDate && localDate > rule.endDate) return false;

  const interval = Math.max(1, rule.interval || 1);

  switch (rule.frequency) {
    case 'ONCE':
      return localDate === rule.startDate;

    case 'DAILY': {
      const diff = daysBetween(rule.startDate, localDate);
      return diff >= 0 && diff % interval === 0;
    }

    case 'WEEKLY':
    case 'CUSTOM_WEEKLY': {
      const wd = isoWeekday(localDate);
      const days =
        rule.daysOfWeek && rule.daysOfWeek.length > 0
          ? rule.daysOfWeek
          : [isoWeekday(rule.startDate)];
      if (!days.includes(wd)) return false;
      // Respect the week interval (every N weeks) relative to the start week.
      const wb = weeksBetween(rule.startDate, localDate);
      return wb >= 0 && wb % interval === 0;
    }

    default:
      return false;
  }
}

/** Resolve the default assignee for a date from the assignment rules. */
export function resolveDefaultAssignee(
  rules: AssignmentRuleInput[],
  localDate: string,
): string | null {
  // Latest effectiveFrom that covers the date wins.
  let best: AssignmentRuleInput | null = null;
  for (const r of rules) {
    if (localDate < r.effectiveFrom) continue;
    if (r.effectiveUntil && localDate > r.effectiveUntil) continue;
    if (!best || r.effectiveFrom > best.effectiveFrom) best = r;
  }
  return best ? best.familyMemberId : null;
}

export interface ResolvedOccurrence {
  templateId: string;
  categoryId: string;
  date: string;
  name: string;
  description: string | null;
  time: string | null;
  timeSlotLabel: string | null;
  isMeal: boolean;
  mealType: MealType | null;
  assignedMemberId: string | null;
  status: CompletionStatus;
  completedAt: string | null;
  completedByMemberId: string | null;
  completionNote: string | null;
  isRecurring: boolean;
  frequency: Frequency | null;
  notes: string | null;
  meal: MealInput | null;
}

export interface ResolveContext {
  template: TemplateInput;
  assignmentRules: AssignmentRuleInput[];
  overridesByDate: Map<string, OverrideInput>;
  completionsByDate: Map<string, CompletionInput>;
  mealsByDate: Map<string, MealInput>;
}

/**
 * Generate resolved occurrences for one template across the given local dates.
 * Merges recurrence firing, per-date overrides, completion, and meal rows.
 */
export function resolveTemplateOccurrences(
  ctx: ResolveContext,
  dates: string[],
): ResolvedOccurrence[] {
  const { template } = ctx;
  const rule = template.rule;
  const out: ResolvedOccurrence[] = [];

  for (const date of dates) {
    const fires = rule ? ruleFiresOn(rule, date) : false;
    const override = ctx.overridesByDate.get(date);

    // Occurrence exists if the rule fires OR an explicit (non-cancelled)
    // override exists for that date (supports "this occurrence only" adds).
    const overrideAdds = !!override && !override.isCancelled;
    if (!fires && !overrideAdds) continue;
    if (override?.isCancelled) continue;

    const completion = ctx.completionsByDate.get(date);
    const meal = ctx.mealsByDate.get(date) ?? null;

    const assignedMemberId = override?.hasAssignment
      ? override.assignedMemberId
      : meal && template.isMeal
        ? meal.assignedMemberId
        : resolveDefaultAssignee(ctx.assignmentRules, date);

    out.push({
      templateId: template.id,
      categoryId: template.categoryId,
      date,
      name: override?.nameOverride ?? template.name,
      description: template.description,
      time: override?.timeOverride ?? rule?.time ?? template.defaultTime,
      timeSlotLabel: template.timeSlotLabel,
      isMeal: template.isMeal,
      mealType: template.mealType,
      assignedMemberId: assignedMemberId ?? null,
      status: completion?.status ?? 'PENDING',
      completedAt: completion?.completedAt ?? null,
      completedByMemberId: completion?.completedByMemberId ?? null,
      completionNote: completion?.note ?? null,
      isRecurring: !!rule && rule.frequency !== 'ONCE',
      frequency: rule?.frequency ?? null,
      notes: override?.notes ?? null,
      meal,
    });
  }

  return out;
}
