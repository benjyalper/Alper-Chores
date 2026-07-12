import type { FamilyMemberDTO } from '@shared/types';
import { contrastText } from '../utils/members';

export function MemberBadge({
  member,
  size = 'md',
}: {
  member: FamilyMemberDTO | null;
  size?: 'sm' | 'md';
}) {
  if (!member) {
    return (
      <span className={`badge badge--empty badge--${size}`}>
        <span aria-hidden="true">○</span> Unassigned
      </span>
    );
  }
  const bg = member.color ?? '#cccccc';
  return (
    <span
      className={`badge badge--${size}`}
      style={{ backgroundColor: bg, color: contrastText(bg) }}
    >
      <span aria-hidden="true">{member.emoji ?? '•'}</span>
      <span>{member.name}</span>
      {!member.isActive && <span className="badge__inactive"> (inactive)</span>}
    </span>
  );
}
