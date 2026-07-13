import { useState } from 'react';
import type { FamilyMemberDTO } from '@shared/types';
import { useMembers, useMemberMutations } from '../api/hooks';
import { api } from '../api/client';
import { MemberBadge } from '../components/MemberBadge';
import { MemberSelect } from '../components/MemberSelect';
import { Dialog } from '../components/Dialog';
import { ListSkeleton } from '../components/Skeletons';
import { useI18n } from '../i18n/I18nContext';
import { contentName } from '../i18n/content';
import { useToast } from '../components/Toast';

const PRESET_COLORS = [
  '#4F86C6',
  '#E4739B',
  '#5FB878',
  '#F0A93E',
  '#9B72CF',
  '#3EC9C9',
  '#E4695B',
  '#7A8B99',
];

const EMPTY = { name: '', color: PRESET_COLORS[0], emoji: '🙂' };

export function MembersPage() {
  const { t, code } = useI18n();
  const toast = useToast();
  const members = useMembers(true);
  const { create, update, deactivate, reactivate } = useMemberMutations();

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<FamilyMemberDTO | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<FamilyMemberDTO | null>(
    null,
  );
  const [futureCount, setFutureCount] = useState(0);
  const [futureChoice, setFutureChoice] = useState<'leave' | 'clear' | 'transfer'>(
    'leave',
  );
  const [transferTo, setTransferTo] = useState<string | null>(null);

  const activeMembers = (members.data ?? []).filter((m) => m.isActive);

  const submitCreate = async (force = false) => {
    if (!form.name.trim()) return;
    try {
      await create.mutateAsync({
        body: { name: form.name.trim(), color: form.color, emoji: form.emoji },
        force,
      });
      toast.success(t('saved'));
      setForm(EMPTY);
    } catch (e) {
      const err = e as { status?: number; message: string };
      if (err.status === 409) {
        if (confirm(`${err.message}`)) return submitCreate(true);
        return;
      }
      toast.error(err.message);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        body: { name: editing.name.trim(), color: editing.color, emoji: editing.emoji },
      });
      toast.success(t('saved'));
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const openDeactivate = async (m: FamilyMemberDTO) => {
    setDeactivateTarget(m);
    setFutureChoice('leave');
    setTransferTo(null);
    try {
      const res = await api.get<{ count: number }>(
        `/members/${m.id}/future-assignments`,
      );
      setFutureCount(res.count);
    } catch {
      setFutureCount(0);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivate.mutateAsync({
        id: deactivateTarget.id,
        body: {
          futureAssignments: futureChoice,
          transferToMemberId: futureChoice === 'transfer' ? transferTo : undefined,
        },
      });
      toast.success(t('saved'));
      setDeactivateTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  return (
    <div className="page">
      <h1 className="page__title">{t('nav_members')}</h1>

      {/* Add member */}
      <section className="panel">
        <h2 className="panel__title">{t('member_add')}</h2>
        <div className="member-form">
          <label className="field">
            <span className="field__label">{t('member_name')} *</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('member_emoji')}</span>
            <input
              type="text"
              maxLength={4}
              className="emoji-input"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            />
          </label>
          <fieldset className="field">
            <legend className="field__label">{t('member_color')}</legend>
            <div className="color-row">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${form.color === c ? ' color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`${t('member_color')} ${c}`}
                  aria-pressed={form.color === c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className="btn btn--primary"
            disabled={create.isPending || !form.name.trim()}
            onClick={() => submitCreate(false)}
          >
            {create.isPending ? t('saving') : t('member_add')}
          </button>
        </div>
      </section>

      {/* Member list */}
      <section className="panel">
        <h2 className="panel__title">{t('nav_members')}</h2>
        {members.isLoading ? (
          <ListSkeleton />
        ) : (members.data?.length ?? 0) === 0 ? (
          <p className="empty-state">{t('empty_members')}</p>
        ) : (
          <ul className="member-list">
            {members.data!.map((m) => (
              <li key={m.id} className={`member-row${m.isActive ? '' : ' member-row--inactive'}`}>
                <MemberBadge member={m} />
                <div className="member-row__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(m)}>
                    {t('edit')}
                  </button>
                  {m.isActive ? (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => openDeactivate(m)}
                    >
                      {t('member_deactivate')}
                    </button>
                  ) : (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => reactivate.mutate(m.id)}
                    >
                      {t('member_reactivate')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit dialog */}
      {editing && (
        <Dialog
          open={!!editing}
          onClose={() => setEditing(null)}
          title={t('edit')}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>
                {t('cancel')}
              </button>
              <button className="btn btn--primary" onClick={submitEdit}>
                {t('save')}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field field--full">
              <span className="field__label">{t('member_name')}</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">{t('member_emoji')}</span>
              <input
                type="text"
                maxLength={4}
                className="emoji-input"
                value={editing.emoji ?? ''}
                onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
              />
            </label>
            <fieldset className="field field--full">
              <legend className="field__label">{t('member_color')}</legend>
              <div className="color-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${editing.color === c ? ' color-swatch--active' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={`${t('member_color')} ${c}`}
                    onClick={() => setEditing({ ...editing, color: c })}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </Dialog>
      )}

      {/* Deactivate dialog with future-assignment handling */}
      {deactivateTarget && (
        <Dialog
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          title={`${t('member_deactivate')} — ${contentName(deactivateTarget.name, code)}`}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setDeactivateTarget(null)}>
                {t('cancel')}
              </button>
              <button
                className="btn btn--danger"
                onClick={confirmDeactivate}
                disabled={futureChoice === 'transfer' && !transferTo}
              >
                {t('member_deactivate')}
              </button>
            </>
          }
        >
          <p>{t('future_assignments_q', { count: futureCount })}</p>
          <fieldset className="scope-options">
            <legend className="sr-only">{t('future_assignments_q', { count: futureCount })}</legend>
            <label className="scope-option">
              <input
                type="radio"
                checked={futureChoice === 'leave'}
                onChange={() => setFutureChoice('leave')}
              />
              <span>{t('fa_leave')}</span>
            </label>
            <label className="scope-option">
              <input
                type="radio"
                checked={futureChoice === 'clear'}
                onChange={() => setFutureChoice('clear')}
              />
              <span>{t('fa_clear')}</span>
            </label>
            <label className="scope-option">
              <input
                type="radio"
                checked={futureChoice === 'transfer'}
                onChange={() => setFutureChoice('transfer')}
              />
              <span>{t('fa_transfer')}</span>
            </label>
            {futureChoice === 'transfer' && (
              <MemberSelect
                members={activeMembers.filter((m) => m.id !== deactivateTarget.id)}
                value={transferTo}
                onChange={setTransferTo}
                ariaLabel={t('transfer_target')}
              />
            )}
          </fieldset>
        </Dialog>
      )}
    </div>
  );
}
