import type { WeeklyScheduleDTO } from '@shared/types';
import { useI18n } from '../../i18n/I18nContext';
import { weekdayDate } from '../../utils/format';

interface Props {
  schedule: WeeklyScheduleDTO;
  onPrev: () => void;
  onThis: () => void;
  onNext: () => void;
}

export function WeekNav({ schedule, onPrev, onThis, onNext }: Props) {
  const { t, code } = useI18n();
  const label = schedule.isCurrentWeek
    ? t('week_current')
    : schedule.isPastWeek
      ? t('week_past')
      : t('week_future');

  return (
    <div className="week-nav">
      <div className="week-nav__buttons">
        <button type="button" className="btn btn--ghost" onClick={onPrev}>
          <span aria-hidden="true">‹</span> {t('week_prev')}
        </button>
        <button
          type="button"
          className={`btn${schedule.isCurrentWeek ? ' btn--primary' : ' btn--ghost'}`}
          onClick={onThis}
        >
          {t('week_this')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onNext}>
          {t('week_next')} <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="week-nav__label">
        <span
          className={`week-badge week-badge--${
            schedule.isCurrentWeek ? 'current' : schedule.isPastWeek ? 'past' : 'future'
          }`}
        >
          {label}
        </span>
        <span className="week-nav__range">
          {weekdayDate(schedule.weekStart, schedule.timezone, code)} —{' '}
          {weekdayDate(schedule.weekEnd, schedule.timezone, code)}
        </span>
      </div>
    </div>
  );
}
