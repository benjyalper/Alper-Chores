// Short weekday labels keyed by ISO weekday (1=Mon .. 7=Sun). Deriving labels
// from the occurrence's actual weekday keeps the UI correct regardless of which
// day the week starts on.
const SHORT: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function weekdayShort(isoWeekday: number): string {
  return SHORT[isoWeekday] ?? '';
}
