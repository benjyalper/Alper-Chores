import { describe, it, expect } from 'vitest';
import {
  occurrenceKey,
  parseOccurrenceKey,
  resolveDefaultAssignee,
  resolveTemplateOccurrences,
  effectiveWeekdays,
  ruleFiresOn,
  type ResolveContext,
  type RuleInput,
  type TemplateInput,
} from '@shared/recurrence';
import { weekDates } from '@shared/dates';

const baseRule = (over: Partial<RuleInput> = {}): RuleInput => ({
  id: 'r1',
  frequency: 'DAILY',
  interval: 1,
  daysOfWeek: [],
  startDate: '2024-01-01',
  endDate: null,
  time: null,
  isActive: true,
  ...over,
});

const week = weekDates('2026-07-08'); // Sun 05 .. Sat 11 (Sunday-start)

describe('ruleFiresOn', () => {
  it('ONCE fires only on the start date', () => {
    const r = baseRule({ frequency: 'ONCE', startDate: '2026-07-09' });
    expect(ruleFiresOn(r, '2026-07-09')).toBe(true);
    expect(ruleFiresOn(r, '2026-07-10')).toBe(false);
  });

  it('DAILY fires every day on/after start', () => {
    const r = baseRule({ frequency: 'DAILY' });
    expect(week.every((d) => ruleFiresOn(r, d))).toBe(true);
  });

  it('DAILY respects interval (every 2 days)', () => {
    const r = baseRule({ frequency: 'DAILY', interval: 2, startDate: '2026-07-06' });
    expect(ruleFiresOn(r, '2026-07-06')).toBe(true);
    expect(ruleFiresOn(r, '2026-07-07')).toBe(false);
    expect(ruleFiresOn(r, '2026-07-08')).toBe(true);
  });

  it('WEEKLY with selected weekdays fires only those days', () => {
    const r = baseRule({
      frequency: 'CUSTOM_WEEKLY',
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startDate: '2026-07-06',
    });
    const fired = week.filter((d) => ruleFiresOn(r, d));
    expect(fired).toEqual(['2026-07-06', '2026-07-08', '2026-07-10']);
  });

  it('respects recurrence start date (no firing before it)', () => {
    const r = baseRule({ frequency: 'DAILY', startDate: '2026-07-09' });
    expect(ruleFiresOn(r, '2026-07-08')).toBe(false);
    expect(ruleFiresOn(r, '2026-07-09')).toBe(true);
  });

  it('respects recurrence end date (no firing after it)', () => {
    const r = baseRule({ frequency: 'DAILY', endDate: '2026-07-09' });
    expect(ruleFiresOn(r, '2026-07-09')).toBe(true);
    expect(ruleFiresOn(r, '2026-07-10')).toBe(false);
  });

  it('inactive rule never fires', () => {
    const r = baseRule({ isActive: false });
    expect(ruleFiresOn(r, '2026-07-08')).toBe(false);
  });
});

describe('occurrence key', () => {
  it('round-trips', () => {
    const key = occurrenceKey('tmpl_abc', '2026-07-08');
    expect(key).toBe('tmpl_abc__2026-07-08');
    expect(parseOccurrenceKey(key)).toEqual({
      templateId: 'tmpl_abc',
      date: '2026-07-08',
    });
  });

  it('rejects malformed keys', () => {
    expect(parseOccurrenceKey('nope')).toBeNull();
    expect(parseOccurrenceKey('t__2026-13-40')).toBeNull();
  });
});

describe('resolveDefaultAssignee', () => {
  it('latest effectiveFrom covering the date wins', () => {
    const rules = [
      { familyMemberId: 'm1', effectiveFrom: '2024-01-01', effectiveUntil: null, dayOfWeek: null },
      { familyMemberId: 'm2', effectiveFrom: '2026-07-08', effectiveUntil: null, dayOfWeek: null },
    ];
    expect(resolveDefaultAssignee(rules, '2026-07-07')).toBe('m1');
    expect(resolveDefaultAssignee(rules, '2026-07-09')).toBe('m2');
  });

  it('ignores rules outside their window', () => {
    const rules = [
      { familyMemberId: 'm1', effectiveFrom: '2026-07-06', effectiveUntil: '2026-07-08', dayOfWeek: null },
    ];
    expect(resolveDefaultAssignee(rules, '2026-07-09')).toBeNull();
  });

  it('a weekday-scoped rule only applies on its weekday', () => {
    // 2026-07-20 is a Monday (ISO weekday 1); 2026-07-21 a Tuesday.
    const rules = [
      { familyMemberId: 'mAll', effectiveFrom: '2024-01-01', effectiveUntil: null, dayOfWeek: null },
      { familyMemberId: 'mMon', effectiveFrom: '2026-07-20', effectiveUntil: null, dayOfWeek: 1 },
    ];
    expect(resolveDefaultAssignee(rules, '2026-07-20')).toBe('mMon'); // Monday
    expect(resolveDefaultAssignee(rules, '2026-07-21')).toBe('mAll'); // Tuesday
    expect(resolveDefaultAssignee(rules, '2026-07-27')).toBe('mMon'); // next Monday
  });
});

describe('effectiveWeekdays', () => {
  const base: RuleInput = {
    id: 'r', frequency: 'DAILY', interval: 1, daysOfWeek: [],
    startDate: '2026-07-20', endDate: null, time: null, isActive: true,
  };
  it('DAILY fires on all seven weekdays', () => {
    expect(effectiveWeekdays(base)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('WEEKLY uses its daysOfWeek', () => {
    expect(effectiveWeekdays({ ...base, frequency: 'WEEKLY', daysOfWeek: [1, 4] })).toEqual([1, 4]);
  });
  it('WEEKLY with no days derives from the start weekday', () => {
    // 2026-07-20 is Monday => [1]
    expect(effectiveWeekdays({ ...base, frequency: 'WEEKLY' })).toEqual([1]);
  });
});

function ctx(
  template: TemplateInput,
  over: Partial<ResolveContext> = {},
): ResolveContext {
  return {
    template,
    assignmentRules: [],
    overridesByDate: new Map(),
    completionsByDate: new Map(),
    mealsByDate: new Map(),
    ...over,
  };
}

const dailyTemplate: TemplateInput = {
  id: 't1',
  categoryId: 'c1',
  name: 'Feed the cat',
  description: null,
  defaultTime: '12:00',
  timeSlotLabel: null,
  sortOrder: 0,
  isActive: true,
  isMeal: false,
  mealType: null,
  rule: baseRule({ frequency: 'DAILY', time: '12:00' }),
};

describe('resolveTemplateOccurrences', () => {
  it('generates a daily occurrence for each day of the week', () => {
    const out = resolveTemplateOccurrences(ctx(dailyTemplate), week);
    expect(out).toHaveLength(7);
    expect(out[0].time).toBe('12:00');
    expect(out.every((o) => o.isRecurring)).toBe(true);
  });

  it('applies a one-occurrence override (name + assignee) to a single date', () => {
    const overrides = new Map([
      [
        '2026-07-08',
        {
          occurrenceDate: '2026-07-08',
          assignedMemberId: 'm3',
          hasAssignment: true,
          nameOverride: 'Feed the cat (extra)',
          timeOverride: '13:30',
          isCancelled: false,
          notes: 'guests over',
        },
      ],
    ]);
    const out = resolveTemplateOccurrences(
      ctx(dailyTemplate, { overridesByDate: overrides }),
      week,
    );
    const wed = out.find((o) => o.date === '2026-07-08')!;
    expect(wed.name).toBe('Feed the cat (extra)');
    expect(wed.assignedMemberId).toBe('m3');
    expect(wed.time).toBe('13:30');
    expect(wed.notes).toBe('guests over');
    // Other days remain default.
    expect(out.find((o) => o.date === '2026-07-07')!.name).toBe('Feed the cat');
  });

  it('a cancelled occurrence is removed from the week', () => {
    const overrides = new Map([
      [
        '2026-07-08',
        {
          occurrenceDate: '2026-07-08',
          assignedMemberId: null,
          hasAssignment: false,
          nameOverride: null,
          timeOverride: null,
          isCancelled: true,
          notes: null,
        },
      ],
    ]);
    const out = resolveTemplateOccurrences(
      ctx(dailyTemplate, { overridesByDate: overrides }),
      week,
    );
    expect(out).toHaveLength(6);
    expect(out.find((o) => o.date === '2026-07-08')).toBeUndefined();
  });

  it('this-and-future assignment via assignment rule applies from a date forward', () => {
    const out = resolveTemplateOccurrences(
      ctx(dailyTemplate, {
        assignmentRules: [
          { familyMemberId: 'mA', effectiveFrom: '2024-01-01', effectiveUntil: null, dayOfWeek: null },
          { familyMemberId: 'mB', effectiveFrom: '2026-07-09', effectiveUntil: null, dayOfWeek: null },
        ],
      }),
      week,
    );
    expect(out.find((o) => o.date === '2026-07-08')!.assignedMemberId).toBe('mA');
    expect(out.find((o) => o.date === '2026-07-09')!.assignedMemberId).toBe('mB');
    expect(out.find((o) => o.date === '2026-07-11')!.assignedMemberId).toBe('mB');
  });

  it('merges completion status for a dated occurrence', () => {
    const completions = new Map([
      [
        '2026-07-10',
        {
          occurrenceDate: '2026-07-10',
          status: 'COMPLETED' as const,
          completedAt: '2026-07-10T09:00:00.000Z',
          completedByMemberId: 'm1',
          note: null,
        },
      ],
    ]);
    const out = resolveTemplateOccurrences(
      ctx(dailyTemplate, { completionsByDate: completions }),
      week,
    );
    const fri = out.find((o) => o.date === '2026-07-10')!;
    expect(fri.status).toBe('COMPLETED');
    expect(fri.completedByMemberId).toBe('m1');
  });

  it('a one-time override with no rule still produces an occurrence (added chore)', () => {
    const noRule: TemplateInput = { ...dailyTemplate, rule: null };
    const overrides = new Map([
      [
        '2026-07-08',
        {
          occurrenceDate: '2026-07-08',
          assignedMemberId: 'm1',
          hasAssignment: true,
          nameOverride: null,
          timeOverride: null,
          isCancelled: false,
          notes: null,
        },
      ],
    ]);
    const out = resolveTemplateOccurrences(
      ctx(noRule, { overridesByDate: overrides }),
      week,
    );
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-07-08');
    expect(out[0].isRecurring).toBe(false);
  });
});
