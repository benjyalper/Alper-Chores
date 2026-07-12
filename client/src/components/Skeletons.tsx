import { useI18n } from '../i18n/I18nContext';

export function ScheduleSkeleton() {
  const { t } = useI18n();
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label={t('loading_schedule')}>
      <div className="skeleton skeleton--bar" />
      <div className="skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label={t('loading')}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}
