// Map Prisma rows -> shared DTOs and engine inputs.

import type {
  FamilyMember,
  ChoreCategory,
  RecurrenceRule,
} from '@prisma/client';
import type {
  CategoryDTO,
  FamilyMemberDTO,
  RecurrenceRuleDTO,
} from '../../../shared/types.js';
import type { RuleInput } from '../../../shared/recurrence.js';
import { utcMidnightToLocalDate } from '../../../shared/dates.js';

export function memberToDTO(m: FamilyMember): FamilyMemberDTO {
  return {
    id: m.id,
    name: m.name,
    color: m.color,
    emoji: m.emoji,
    isActive: m.isActive,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function categoryToDTO(c: ChoreCategory): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    isMealCategory: c.isMealCategory,
  };
}

export function ruleToDTO(r: RecurrenceRule): RecurrenceRuleDTO {
  return {
    id: r.id,
    frequency: r.frequency,
    interval: r.interval,
    daysOfWeek: r.daysOfWeek,
    startDate: utcMidnightToLocalDate(r.startDate),
    endDate: r.endDate ? utcMidnightToLocalDate(r.endDate) : null,
    time: r.time,
    timezone: r.timezone,
    isActive: r.isActive,
  };
}

export function ruleToInput(r: RecurrenceRule): RuleInput {
  return {
    id: r.id,
    frequency: r.frequency,
    interval: r.interval,
    daysOfWeek: r.daysOfWeek,
    startDate: utcMidnightToLocalDate(r.startDate),
    endDate: r.endDate ? utcMidnightToLocalDate(r.endDate) : null,
    time: r.time,
    isActive: r.isActive,
  };
}
