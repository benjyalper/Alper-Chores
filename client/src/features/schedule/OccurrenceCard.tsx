import { useState } from 'react';
import type {
  AssignmentScope,
  FamilyMemberDTO,
  OccurrenceDTO,
} from '@shared/types';
import { MemberSelect } from '../../components/MemberSelect';
import { StatusControl } from '../../components/StatusControl';
import { ScopeDialog } from '../../components/ScopeDialog';
import { useI18n } from '../../i18n/I18nContext';
import { contentName } from '../../i18n/content';
import { setLastMemberId } from '../../utils/members';

interface Props {
  occ: OccurrenceDTO;
  members: FamilyMemberDTO[];
  onAssign: (occ: OccurrenceDTO, memberId: string | null, scope: AssignmentScope) => void;
  onStatus: (occ: OccurrenceDTO, status: OccurrenceDTO['status']) => void;
  onOpenMeal: (occ: OccurrenceDTO) => void;
  onReset: (occ: OccurrenceDTO) => void;
  busy?: boolean;
}

const MEAL_PLAN_KEY: Record<string, string> = {
  HOME_COOKED: 'meal_home',
  RESTAURANT: 'meal_restaurant',
  TAKEOUT: 'meal_takeout',
  LEFTOVERS: 'meal_leftovers',
  OTHER: 'meal_other',
};

export function OccurrenceCard({
  occ,
  members,
  onAssign,
  onStatus,
  onOpenMeal,
  onReset,
  busy,
}: Props) {
  const { t, code } = useI18n();
  const [pendingMember, setPendingMember] = useState<string | null | undefined>(
    undefined,
  );
  const [scopeOpen, setScopeOpen] = useState(false);

  const handleChange = (memberId: string | null) => {
    setLastMemberId(memberId);
    if (occ.isRecurring) {
      setPendingMember(memberId);
      setScopeOpen(true);
    } else {
      onAssign(occ, memberId, 'occurrence');
    }
  };

  const confirmScope = (scope: AssignmentScope) => {
    onAssign(occ, pendingMember ?? null, scope);
    setScopeOpen(false);
    setPendingMember(undefined);
  };

  const statusClass =
    occ.status === 'COMPLETED'
      ? ' card--done'
      : occ.status === 'SKIPPED'
        ? ' card--skipped'
        : '';

  const mealSummary =
    occ.isMeal && occ.mealSummary
      ? occ.mealSummary.description ||
        (occ.mealSummary.planType
          ? t(MEAL_PLAN_KEY[occ.mealSummary.planType])
          : t('not_planned'))
      : null;

  return (
    <div className={`card${statusClass}`}>
      <div className="card__head">
        <div className="card__title-row">
          {occ.time && <span className="card__time">{occ.time}</span>}
          {occ.timeSlotLabel && (
            <span className="chip chip--slot">
              {contentName(occ.timeSlotLabel, code)}
            </span>
          )}
          <span className="card__name">{contentName(occ.name, code)}</span>
        </div>
        <div className="card__indicators">
          <span aria-hidden="true" className="card__status-icons">
            {occ.hasNotes && (
              <span className="chip chip--notes" title={t('indicator_notes')}>
                📝
              </span>
            )}
            {occ.status === 'COMPLETED' && <span className="chip chip--ok">✓</span>}
            {occ.status === 'SKIPPED' && (
              <span className="chip chip--skip chip--active">⤼</span>
            )}
          </span>
          <button
            type="button"
            className="chip chip--recurring reset-btn"
            title={t('reset_chore')}
            aria-label={t('reset_chore')}
            onClick={() => onReset(occ)}
            disabled={busy}
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
      </div>

      {occ.isMeal ? (
        <button
          type="button"
          className="card__meal-summary"
          onClick={() => onOpenMeal(occ)}
        >
          <span className="card__meal-text">{mealSummary}</span>
          <span className="link-like">{t('edit')} →</span>
        </button>
      ) : null}

      <div className="card__controls">
        <label className="sr-only" htmlFor={`assign-${occ.occurrenceKey}`}>
          {t('unassigned')}
        </label>
        <MemberSelect
          id={`assign-${occ.occurrenceKey}`}
          members={members}
          value={occ.assignedMemberId}
          onChange={handleChange}
          disabled={busy}
          ariaLabel={`Assign ${occ.name}`}
        />
        <StatusControl
          status={occ.status}
          onChange={(s) => onStatus(occ, s)}
          busy={busy}
          compact
        />
      </div>

      <ScopeDialog
        open={scopeOpen}
        recurring={occ.isRecurring}
        onClose={() => {
          setScopeOpen(false);
          setPendingMember(undefined);
        }}
        onConfirm={confirmScope}
      />
    </div>
  );
}
