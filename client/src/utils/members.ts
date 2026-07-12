import type { FamilyMemberDTO } from '@shared/types';

/** Pick readable text color (black/white) for a given hex background. */
export function contrastText(hex: string | null | undefined): string {
  if (!hex) return '#1a1a1a';
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#1a1a1a';
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Relative luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1a1a1a' : '#ffffff';
}

export function memberById(members: FamilyMemberDTO[], id: string | null) {
  if (!id) return null;
  return members.find((m) => m.id === id) ?? null;
}

const LAST_MEMBER_KEY = 'alper.lastMemberId';

/** Remembering the last-selected member is a harmless UI preference. */
export function getLastMemberId(): string | null {
  return localStorage.getItem(LAST_MEMBER_KEY);
}
export function setLastMemberId(id: string | null) {
  if (id) localStorage.setItem(LAST_MEMBER_KEY, id);
}

const LAST_DAY_KEY = 'alper.lastDayIndex';
export function getLastDayIndex(): number | null {
  const v = localStorage.getItem(LAST_DAY_KEY);
  return v == null ? null : Number(v);
}
export function setLastDayIndex(i: number) {
  localStorage.setItem(LAST_DAY_KEY, String(i));
}
