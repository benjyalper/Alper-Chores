import { Fragment } from 'react';
import type {
  AssignmentScope,
  FamilyMemberDTO,
  OccurrenceDTO,
  WeeklyScheduleDTO,
} from '@shared/types';
import { OccurrenceCard } from './OccurrenceCard';
import { useI18n } from '../../i18n/I18nContext';
import { contentName } from '../../i18n/content';
import { monthDay, weekdayShort } from '../../utils/format';

interface Props {
  schedule: WeeklyScheduleDTO;
  members: FamilyMemberDTO[];
  onAssign: (occ: OccurrenceDTO, memberId: string | null, scope: AssignmentScope) => void;
  onStatus: (occ: OccurrenceDTO, status: OccurrenceDTO['status']) => void;
  onOpenMeal: (occ: OccurrenceDTO) => void;
  onRefresh: (occ: OccurrenceDTO) => void;
}

export function DesktopGrid({
  schedule,
  members,
  onAssign,
  onStatus,
  onOpenMeal,
  onRefresh,
}: Props) {
  const { t, code } = useI18n();

  // A single 7-column grid holds the day headers, each category's full-width
  // title row, and every day cell — so header and card columns always line up
  // (previously the header and card grids were separate and could diverge,
  // clipping the edge column, especially in RTL).
  const cols = `repeat(7, minmax(150px, 1fr))`;

  return (
    <div className="grid-scroll">
      <div className="week-grid" style={{ gridTemplateColumns: cols }}>
        {/* Day headers */}
        {schedule.days.map((day) => (
          <div
            key={day.date}
            className={`day-head${day.isToday ? ' day-head--today' : ''}`}
          >
            <span className="day-head__name">
              {weekdayShort(day.date, schedule.timezone, code)}
            </span>
            <span className="day-head__date">
              {monthDay(day.date, schedule.timezone, code)}
            </span>
            {day.isToday && <span className="day-head__today">{t('today')}</span>}
            <span className="day-head__progress">
              {day.completedCount}/{day.totalCount}
            </span>
          </div>
        ))}

        {/* Categories as sections */}
        {schedule.categories.map((cat) => {
          const anyInWeek = schedule.days.some((d) =>
            d.occurrences.some((o) => o.categoryId === cat.id),
          );
          if (!anyInWeek) return null;
          return (
            <Fragment key={cat.id}>
              <h3 className="cat-title" style={{ gridColumn: '1 / -1' }}>
                {contentName(cat.name, code)}
              </h3>
              {schedule.days.map((day) => {
                const items = day.occurrences.filter(
                  (o) => o.categoryId === cat.id,
                );
                return (
                  <div
                    key={day.date + cat.id}
                    className={`cell${day.isToday ? ' cell--today' : ''}`}
                  >
                    {items.length === 0 ? (
                      <span className="cell__empty">—</span>
                    ) : (
                      items.map((occ) => (
                        <OccurrenceCard
                          key={occ.occurrenceKey}
                          occ={occ}
                          members={members}
                          onAssign={onAssign}
                          onStatus={onStatus}
                          onOpenMeal={onOpenMeal}
                          onRefresh={onRefresh}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
