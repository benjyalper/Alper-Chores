import type { FamilyMemberDTO } from '@shared/types';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  members: FamilyMemberDTO[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/** Native <select> for assigning a member (accessible, keyboard-friendly). */
export function MemberSelect({
  members,
  value,
  onChange,
  id,
  disabled,
  ariaLabel,
}: Props) {
  const { t } = useI18n();
  const active = members.filter((m) => m.isActive || m.id === value);
  return (
    <select
      id={id}
      className="member-select"
      value={value ?? ''}
      disabled={disabled}
      aria-label={ariaLabel ?? 'Assign member'}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    >
      <option value="">{t('unassigned')}</option>
      {active.map((m) => (
        <option key={m.id} value={m.id}>
          {m.emoji ? `${m.emoji} ` : ''}
          {m.name}
          {!m.isActive ? ` (${t('member_inactive_label')})` : ''}
        </option>
      ))}
    </select>
  );
}
