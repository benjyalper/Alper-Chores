import { describe, it, expect } from 'vitest';
import {
  addLocalDays,
  daysBetween,
  isoWeekday,
  localDateToUtcMidnight,
  startOfWeek,
  toLocalDate,
  weekDates,
  weeksBetween,
} from '@shared/dates';

describe('week calculation (Sunday–Saturday)', () => {
  it('startOfWeek returns Sunday for any day in the week (default)', () => {
    // 2026-07-12 is a Sunday -> itself.
    expect(startOfWeek('2026-07-12')).toBe('2026-07-12');
    // 2026-07-06 is a Monday -> Sunday before = 2026-07-05.
    expect(startOfWeek('2026-07-06')).toBe('2026-07-05');
    // 2026-07-08 (Wed) -> Sunday 2026-07-05.
    expect(startOfWeek('2026-07-08')).toBe('2026-07-05');
  });

  it('supports a Monday-start week when requested', () => {
    expect(startOfWeek('2026-07-08', 'MONDAY')).toBe('2026-07-06');
    expect(startOfWeek('2026-07-12', 'MONDAY')).toBe('2026-07-06');
  });

  it('weekDates yields 7 consecutive days Sun..Sat', () => {
    const days = weekDates('2026-07-08');
    expect(days).toEqual([
      '2026-07-05',
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
    ]);
    expect(isoWeekday(days[0])).toBe(7); // Sunday
    expect(isoWeekday(days[6])).toBe(6); // Saturday
  });

  it('previous and next week navigation shifts by 7 days', () => {
    const sunday = startOfWeek('2026-07-08');
    expect(sunday).toBe('2026-07-05');
    expect(addLocalDays(sunday, -7)).toBe('2026-06-28');
    expect(addLocalDays(sunday, 7)).toBe('2026-07-12');
  });

  it('daysBetween and weeksBetween', () => {
    expect(daysBetween('2026-07-06', '2026-07-13')).toBe(7);
    expect(weeksBetween('2026-07-06', '2026-07-20')).toBe(2);
  });
});

describe('isoWeekday', () => {
  it('maps Sunday to 7 and Monday to 1', () => {
    expect(isoWeekday('2026-07-12')).toBe(7); // Sunday
    expect(isoWeekday('2026-07-13')).toBe(1); // Monday
    expect(isoWeekday('2026-07-17')).toBe(5); // Friday
  });
});

describe('Israel timezone conversion', () => {
  it('an instant late evening UTC is next day in Asia/Jerusalem', () => {
    // 2026-07-12T22:30:00Z -> Jerusalem is UTC+3 in summer -> 01:30 on 07-13.
    const instant = new Date('2026-07-12T22:30:00Z');
    expect(toLocalDate(instant, 'Asia/Jerusalem')).toBe('2026-07-13');
    // Same instant in UTC is still the 12th.
    expect(toLocalDate(instant, 'UTC')).toBe('2026-07-12');
  });

  it('a chore date stays the same regardless of server timezone', () => {
    // localDateToUtcMidnight is deterministic and tz-independent.
    expect(localDateToUtcMidnight('2026-07-13').toISOString()).toBe(
      '2026-07-13T00:00:00.000Z',
    );
  });
});

describe('daylight-saving boundaries', () => {
  it('addLocalDays crosses the Israel spring-forward DST without drift', () => {
    // Israel DST in 2026 starts Fri 2026-03-27. Date math is pure calendar days.
    expect(addLocalDays('2026-03-26', 1)).toBe('2026-03-27');
    expect(addLocalDays('2026-03-27', 1)).toBe('2026-03-28');
    expect(daysBetween('2026-03-26', '2026-03-29')).toBe(3);
  });

  it('week containing a DST change still has exactly 7 days', () => {
    // 2026-03-27 is a Friday; the Sunday-start week is 03-22 .. 03-28.
    const days = weekDates('2026-03-27');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-03-22');
    expect(days[6]).toBe('2026-03-28');
  });
});
