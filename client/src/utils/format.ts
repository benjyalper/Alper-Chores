// Locale-aware date formatting for the UI. Uses date-fns locales so weekday and
// month names appear in Hebrew or English based on the current language.

import { formatInTimeZone } from 'date-fns-tz';
import { enUS, he } from 'date-fns/locale';
import { addLocalDays, localDateToUtcMidnight } from '@shared/dates';

const localeFor = (code: string) => (code === 'he' ? he : enUS);

function fmt(localDate: string, tz: string, code: string, pattern: string): string {
  return formatInTimeZone(localDateToUtcMidnight(localDate), tz, pattern, {
    locale: localeFor(code),
  });
}

/** Short weekday, e.g. "Sun" / "א׳". */
export const weekdayShort = (localDate: string, tz: string, code: string) =>
  fmt(localDate, tz, code, 'EEEEEE');

/** "Jul 12" / "12 ביולי". */
export const monthDay = (localDate: string, tz: string, code: string) =>
  fmt(localDate, tz, code, 'd MMM');

/** "Sun, Jul 12" / "יום א׳, 12 ביולי". */
export const weekdayDate = (localDate: string, tz: string, code: string) =>
  fmt(localDate, tz, code, 'EEE, d MMM');

/** Short weekday label for an ISO weekday number (1=Mon..7=Sun), for pickers. */
export function isoWeekdayShort(isoWeekday: number, code: string): string {
  // 2024-01-01 is a Monday (ISO 1); offset to the requested weekday.
  const sample = addLocalDays('2024-01-01', isoWeekday - 1);
  return fmt(sample, 'UTC', code, 'EEEEEE');
}
