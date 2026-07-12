import type {
  AssignmentScope,
  FamilyMemberDTO,
  OccurrenceDTO,
  WeeklyScheduleDTO,
} from '@shared/types';
import { formatDisplayDate } from '@shared/dates';
import { OccurrenceCard } from './OccurrenceCard';
import { useI18n } from '../../i18n/I18nContext';
import { weekdayShort } from '../../utils/weekdays';

interface Props {
  schedule: WeeklyScheduleDTO;
  members: FamilyMemberDTO[];
  onAssign: (occ: OccurrenceDTO, memberId: string | null, scope: AssignmentScope) => void;
  onStatus: (occ: OccurrenceDTO, status: OccurrenceDTO['status']) => void;
  onOpenMeal: (occ: OccurrenceDTO) => void;
}

export function DesktopGrid({
  schedule,
  members,
  onAssign,
  onStatus,
  onOpenMeal,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="grid-scroll">
      <div
        className="week-grid"
        style={{ gridTemplateColumns: `repeat(7, minmax(180px, 1fr))` }}
      >
        {/* Day headers */}
        {schedule.days.map((day) => (
          <div
            key={day.date}
            className={`day-head${day.isToday ? ' day-head--today' : ''}`}
          >
            <span className="day-head__name">{weekdayShort(day.weekday)}</span>
            <span className="day-head__date">
              {formatDisplayDate(day.date, schedule.timezone).replace(/^\w+, /, '')}
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
            <div key={cat.id} className="cat-block" style={{ gridColumn: '1 / -1' }}>
              <h3 className="cat-title">{cat.name}</h3>
              <div
                className="cat-cells"
                style={{ gridTemplateColumns: `repeat(7, minmax(180px, 1fr))` }}
              >
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
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
