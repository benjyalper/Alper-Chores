import type { CompletionStatus } from '@shared/types';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  status: CompletionStatus;
  onChange: (status: CompletionStatus) => void;
  busy?: boolean;
  compact?: boolean;
}

/**
 * Completion control. A checkbox toggles pending/completed; a separate button
 * marks skipped. Status is conveyed by text + icon, never color alone.
 */
export function StatusControl({ status, onChange, busy, compact }: Props) {
  const { t } = useI18n();
  const done = status === 'COMPLETED';
  const skipped = status === 'SKIPPED';

  return (
    <div className={`status-control${compact ? ' status-control--compact' : ''}`}>
      <label className="status-check">
        <input
          type="checkbox"
          checked={done}
          disabled={busy}
          onChange={() => onChange(done ? 'PENDING' : 'COMPLETED')}
        />
        <span className="status-check__label">
          {done ? t('status_completed') : t('mark_done')}
        </span>
      </label>
      <button
        type="button"
        className={`chip chip--skip${skipped ? ' chip--active' : ''}`}
        aria-pressed={skipped}
        disabled={busy}
        onClick={() => onChange(skipped ? 'PENDING' : 'SKIPPED')}
      >
        {skipped ? t('status_skipped') : t('mark_skipped')}
      </button>
    </div>
  );
}
