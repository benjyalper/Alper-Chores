import { useState } from 'react';
import type { AssignmentScope } from '@shared/types';
import { Dialog } from './Dialog';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: AssignmentScope) => void;
  /** Whether the occurrence belongs to a recurring series. */
  recurring: boolean;
  title?: string;
}

/**
 * Asks whether an assignment change applies to just this occurrence, the rest
 * of the week, this-and-future, or the entire series. For non-recurring chores
 * only the occurrence option is offered.
 */
export function ScopeDialog({ open, onClose, onConfirm, recurring, title }: Props) {
  const { t } = useI18n();
  const [scope, setScope] = useState<AssignmentScope>('occurrence');

  // Recurring chores offer just two choices: this single slot, or the slot on
  // every week from here on. Non-recurring chores only ever touch one slot.
  const options: { value: AssignmentScope; label: string }[] = recurring
    ? [
        { value: 'occurrence', label: t('scope_this_only') },
        { value: 'this-and-future', label: t('scope_recurring') },
      ]
    : [{ value: 'occurrence', label: t('scope_this_only') }];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? t('scope_question')}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onConfirm(scope)}
          >
            {t('save')}
          </button>
        </>
      }
    >
      <fieldset className="scope-options">
        <legend className="sr-only">{t('scope_question')}</legend>
        {options.map((o) => (
          <label key={o.value} className="scope-option">
            <input
              type="radio"
              name="scope"
              value={o.value}
              checked={scope === o.value}
              onChange={() => setScope(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
    </Dialog>
  );
}
