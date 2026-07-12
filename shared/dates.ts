// Date utilities for Alper Chores.
//
// Terminology:
//   - "local date"  : a calendar day in the household timezone, as "YYYY-MM-DD".
//   - "UTC instant" : a concrete Date object (timestamp) stored in Postgres.
//
// We deliberately model the schedule in terms of LOCAL DATES (strings), not
// Date objects, to avoid off-by-one bugs around midnight and DST. A chore on
// "Monday in Israel" is stored as the string "2026-07-13" and stays Monday no
// matter what timezone the server runs in. When we must persist a @db.Date we
// convert the local date to UTC midnight so Prisma round-trips it losslessly.

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TZ = 'Asia/Jerusalem';

/** Regex for a strict ISO local date. */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** The local date ("YYYY-MM-DD") that `instant` falls on in `tz`. */
export function toLocalDate(instant: Date, tz: string = DEFAULT_TZ): string {
  return formatInTimeZone(instant, tz, 'yyyy-MM-dd');
}

/** Today's local date in the given timezone. */
export function todayLocalDate(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return toLocalDate(now, tz);
}

/**
 * Convert a local date string to the Date representing UTC midnight of that day.
 * Used for @db.Date columns, which Prisma treats as date-only at UTC midnight.
 */
export function localDateToUtcMidnight(localDate: string): Date {
  if (!ISO_DATE_RE.test(localDate)) {
    throw new Error(`Invalid local date: ${localDate}`);
  }
  return new Date(`${localDate}T00:00:00.000Z`);
}

/** Convert a @db.Date value (UTC midnight) back to a local date string. */
export function utcMidnightToLocalDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO weekday for a local date: 1=Monday .. 7=Sunday. */
export function isoWeekday(localDate: string): number {
  // Interpret at UTC midnight; getUTCDay: 0=Sun..6=Sat -> map to 1..7 (Mon..Sun)
  const day = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Add `days` calendar days to a local date string (DST-safe: pure date math). */
export function addLocalDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole calendar days between two local dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00.000Z`).getTime();
  const db = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

/** Monday (ISO) of the week containing `localDate`. */
export function startOfWeekMonday(localDate: string): string {
  const wd = isoWeekday(localDate); // 1..7
  return addLocalDays(localDate, -(wd - 1));
}

/** The 7 local dates Monday..Sunday for the week containing `localDate`. */
export function weekDates(localDate: string): string[] {
  const monday = startOfWeekMonday(localDate);
  return Array.from({ length: 7 }, (_, i) => addLocalDays(monday, i));
}

/** a <= b for local dates. */
export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b;
}

/** a >= b for local dates. */
export function isOnOrAfter(a: string, b: string): boolean {
  return a >= b;
}

/** Whole weeks between the Mondays of two local dates. */
export function weeksBetween(a: string, b: string): number {
  const ma = startOfWeekMonday(a);
  const mb = startOfWeekMonday(b);
  return Math.round(daysBetween(ma, mb) / 7);
}

/**
 * Build a UTC instant for a local date + "HH:mm" wall-clock time in a timezone.
 * Useful when a completion/reminder needs a real timestamp.
 */
export function localDateTimeToInstant(
  localDate: string,
  time: string,
  tz: string = DEFAULT_TZ,
): Date {
  // date-fns-tz: interpret the wall time in tz and get the UTC instant.
  // We construct via toZonedTime's inverse using a formatted parse.
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  // Start from UTC midnight of the local date, then find the offset in tz.
  const base = new Date(`${localDate}T00:00:00.000Z`);
  const zoned = toZonedTime(base, tz);
  const offsetMs = base.getTime() - zoned.getTime();
  return new Date(base.getTime() + offsetMs + (h * 60 + m) * 60_000);
}

/** Format a local date for display, e.g. "Mon, Jul 13". */
export function formatDisplayDate(localDate: string, tz: string = DEFAULT_TZ): string {
  return formatInTimeZone(localDateToUtcMidnight(localDate), tz, 'EEE, MMM d');
}
