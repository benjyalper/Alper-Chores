import { useEffect, useState } from 'react';
import type {
  AssignmentScope,
  FamilyMemberDTO,
  OccurrenceDTO,
  WeeklyScheduleDTO,
} from '@shared/types';
import { OccurrenceCard } from './OccurrenceCard';
import { useI18n } from '../../i18n/I18nContext';
import { getLastDayIndex, setLastDayIndex } from '../../utils/members';
import { weekdayDate, weekdayShort } from '../../utils/format';

interface Props {
  schedule: WeeklyScheduleDTO;
  members: FamilyMemberDTO[];
  onAssign: (occ: OccurrenceDTO, memberId: string | null, scope: AssignmentScope) => void;
  onStatus: (occ: OccurrenceDTO, status: OccurrenceDTO['status']) => void;
  onOpenMeal: (occ: OccurrenceDTO) => void;
}

export function MobileDay({
  schedule,
  members,
  onAssign,
  onStatus,
  onOpenMeal,
}: Props) {
  const { t, code } = useI18n();
  const todayIdx = schedule.days.findIndex((d) => d.isToday);
  const [selected, setSelected] = useState(() => {
    if (todayIdx >= 0) return todayIdx;
    const last = getLastDayIndex();
    return last != null && last >= 0 && last < 7 ? last : 0;
  });

  useEffect(() => {
    setLastDayIndex(selected);
  }, [selected]);

  const day = schedule.days[selected];

  return (
    <div className="mobile-day">
      {/* Weekly overview with per-day progress */}
      <div className="day-selector" role="tablist" aria-label={t('weekly_progress')}>
        {schedule.days.map((d, i) => {
          const pct = d.totalCount ? Math.round((d.completedCount / d.totalCount) * 100) : 0;
          return (
            <button
              key={d.date}
              role="tab"
              aria-selected={i === selected}
              className={`day-pill${i === selected ? ' day-pill--active' : ''}${
                d.isToday ? ' day-pill--today' : ''
              }`}
              onClick={() => setSelected(i)}
            >
              <span className="day-pill__name">
                {weekdayShort(d.date, schedule.timezone, code)}
              </span>
              <span className="day-pill__num">{d.date.slice(8)}</span>
              <span className="day-pill__bar" aria-hidden="true">
                <span className="day-pill__fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="sr-only">
                {t('done_count', { done: d.completedCount, total: d.totalCount })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mobile-day__header">
        <h2>{weekdayDate(day.date, schedule.timezone, code)}</h2>
        {day.isToday && <span className="week-badge week-badge--current">{t('today')}</span>}
        <span className="mobile-day__progress">
          {day.completedCount}/{day.totalCount}
        </span>
      </div>

      {day.occurrences.length === 0 ? (
        <p className="empty-state">✨ {t('empty_day')}</p>
      ) : (
        schedule.categories.map((cat) => {
          const items = day.occurrences.filter((o) => o.categoryId === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} className="mobile-cat">
              <h3 className="cat-title">{cat.name}</h3>
              {items.map((occ) => (
                <OccurrenceCard
                  key={occ.occurrenceKey}
                  occ={occ}
                  members={members}
                  onAssign={onAssign}
                  onStatus={onStatus}
                  onOpenMeal={onOpenMeal}
                />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
