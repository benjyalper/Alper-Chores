import { useMemo, useState } from 'react';
import type { ChoreTemplateDTO } from '@shared/types';
import { todayLocalDate } from '@shared/dates';
import {
  useChores,
  useChoreMutations,
  useCategories,
  useCreateCategory,
} from '../api/hooks';
import { useMembers } from '../api/hooks';
import { ChoreForm, type ChoreFormValue } from '../features/schedule/ChoreForm';
import { ListSkeleton } from '../components/Skeletons';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../components/Toast';

const FREQ_LABEL: Record<string, string> = {
  ONCE: 'Once',
  DAILY: 'Every day',
  WEEKLY: 'Weekly',
  CUSTOM_WEEKLY: 'Selected days',
};

export function ManageChoresPage() {
  const { t } = useI18n();
  const toast = useToast();
  const chores = useChores(true);
  const categories = useCategories();
  const members = useMembers(true);
  const { create, update, remove } = useChoreMutations();
  const createCategory = useCreateCategory();

  const [editing, setEditing] = useState<ChoreTemplateDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const today = todayLocalDate();
  const catName = useMemo(() => {
    const map = new Map<string, string>();
    (categories.data ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories.data]);

  const buildPayload = (v: ChoreFormValue) => ({
    name: v.name.trim(),
    categoryId: v.categoryId,
    description: v.description || null,
    defaultTime: v.defaultTime || null,
    timeSlotLabel: v.timeSlotLabel || null,
    isMeal: v.isMeal,
    mealType: v.isMeal ? v.mealType || null : null,
    defaultMemberId: v.defaultMemberId,
    recurrence: {
      frequency: v.recurrence.frequency,
      interval: v.recurrence.interval,
      daysOfWeek: v.recurrence.daysOfWeek,
      startDate: v.recurrence.startDate,
      endDate: v.recurrence.endDate || null,
      time: v.recurrence.time || v.defaultTime || null,
    },
  });

  const handleCreate = async (v: ChoreFormValue) => {
    try {
      await create.mutateAsync(buildPayload(v));
      toast.success(t('saved'));
      setAdding(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const handleUpdate = async (v: ChoreFormValue) => {
    if (!editing) return;
    try {
      await update.mutateAsync({ id: editing.id, body: buildPayload(v) });
      toast.success(t('saved'));
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const toggleActive = async (c: ChoreTemplateDTO) => {
    try {
      await update.mutateAsync({ id: c.id, body: { isActive: !c.isActive } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const handleDelete = async (c: ChoreTemplateDTO) => {
    if (!confirm(`Delete "${c.name}"? Chores with history are deactivated instead.`))
      return;
    try {
      const res = (await remove.mutateAsync(c.id)) as {
        deleted: boolean;
        deactivated: boolean;
      };
      toast.success(res.deactivated ? 'Deactivated (had history)' : 'Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategory.trim() });
      toast.success(t('saved'));
      setNewCategory('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  return (
    <div className="page">
      <div className="page__toolbar">
        <h1 className="page__title">{t('nav_chores')}</h1>
        <button
          className="btn btn--primary"
          onClick={() => setAdding(true)}
          disabled={!categories.data?.length}
        >
          + {t('add_chore')}
        </button>
      </div>

      <section className="panel">
        <h2 className="panel__title">{t('category')}</h2>
        <div className="inline-form">
          <input
            type="text"
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button
            className="btn btn--ghost"
            onClick={addCategory}
            disabled={!newCategory.trim() || createCategory.isPending}
          >
            Add category
          </button>
        </div>
        <div className="cat-chips">
          {(categories.data ?? []).map((c) => (
            <span key={c.id} className="chip chip--slot">
              {c.name}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">{t('nav_chores')}</h2>
        {chores.isLoading ? (
          <ListSkeleton rows={6} />
        ) : (chores.data?.length ?? 0) === 0 ? (
          <p className="empty-state">{t('empty_no_custom')}</p>
        ) : (
          <table className="chore-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Repeats</th>
                <th>Time</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {chores.data!.map((c) => (
                <tr key={c.id} className={c.isActive ? '' : 'row--inactive'}>
                  <td data-label="Name">
                    {c.name}
                    {c.isMeal && <span className="chip chip--slot">Meal</span>}
                  </td>
                  <td data-label="Category">{catName.get(c.categoryId) ?? '—'}</td>
                  <td data-label="Repeats">
                    {c.recurrence ? FREQ_LABEL[c.recurrence.frequency] : '—'}
                  </td>
                  <td data-label="Time">{c.defaultTime ?? '—'}</td>
                  <td data-label="Status">
                    <span className={`dot ${c.isActive ? 'dot--on' : 'dot--off'}`} />
                    {c.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td data-label="Actions" className="chore-table__actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(c)}>
                      {t('edit')}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => toggleActive(c)}>
                      {c.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm btn--danger-text"
                      onClick={() => handleDelete(c)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {adding && categories.data && (
        <ChoreForm
          open={adding}
          title={t('add_chore')}
          onClose={() => setAdding(false)}
          onSubmit={handleCreate}
          categories={categories.data}
          members={members.data ?? []}
          defaultDate={today}
          submitting={create.isPending}
        />
      )}

      {editing && categories.data && (
        <ChoreForm
          open={!!editing}
          title={`${t('edit')} — ${editing.name}`}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
          categories={categories.data}
          members={members.data ?? []}
          defaultDate={today}
          initial={editing}
          submitting={update.isPending}
        />
      )}
    </div>
  );
}
