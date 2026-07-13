import { useEffect, useState } from 'react';
import type {
  FamilyMemberDTO,
  MealPlanType,
  OccurrenceDTO,
} from '@shared/types';
import { Dialog } from '../../components/Dialog';
import { MemberSelect } from '../../components/MemberSelect';
import { useMeal, useSetMeal } from '../../api/hooks';
import { useI18n } from '../../i18n/I18nContext';
import { contentName } from '../../i18n/content';
import { useToast } from '../../components/Toast';

interface Props {
  occ: OccurrenceDTO | null;
  members: FamilyMemberDTO[];
  onClose: () => void;
}

const PLAN_TYPES: { value: MealPlanType; key: string }[] = [
  { value: 'HOME_COOKED', key: 'meal_home' },
  { value: 'RESTAURANT', key: 'meal_restaurant' },
  { value: 'TAKEOUT', key: 'meal_takeout' },
  { value: 'LEFTOVERS', key: 'meal_leftovers' },
  { value: 'OTHER', key: 'meal_other' },
];

const isValidUrl = (v: string) => v === '' || /^https?:\/\/.+/i.test(v);

export function MealDialog({ occ, members, onClose }: Props) {
  const { t, code } = useI18n();
  const toast = useToast();
  const meal = useMeal(occ?.occurrenceKey ?? null);
  const setMeal = useSetMeal();

  const [form, setForm] = useState({
    planType: '' as '' | MealPlanType,
    assignedMemberId: null as string | null,
    description: '',
    recipeUrl: '',
    restaurantName: '',
    restaurantUrl: '',
    takeoutProvider: '',
    notes: '',
  });

  useEffect(() => {
    if (meal.data) {
      setForm({
        planType: (meal.data.planType ?? '') as '' | MealPlanType,
        assignedMemberId: meal.data.assignedMemberId ?? null,
        description: meal.data.description ?? '',
        recipeUrl: meal.data.recipeUrl ?? '',
        restaurantName: meal.data.restaurantName ?? '',
        restaurantUrl: meal.data.restaurantUrl ?? '',
        takeoutProvider: meal.data.takeoutProvider ?? '',
        notes: meal.data.notes ?? '',
      });
    }
  }, [meal.data]);

  if (!occ) return null;

  const recipeInvalid = !isValidUrl(form.recipeUrl.trim());
  const restaurantInvalid = !isValidUrl(form.restaurantUrl.trim());

  const submit = async () => {
    if (recipeInvalid || restaurantInvalid) return;
    try {
      await setMeal.mutateAsync({
        occurrenceKey: occ.occurrenceKey,
        data: {
          planType: form.planType || null,
          assignedMemberId: form.assignedMemberId,
          description: form.description || null,
          recipeUrl: form.recipeUrl.trim() || null,
          restaurantName: form.restaurantName || null,
          restaurantUrl: form.restaurantUrl.trim() || null,
          takeoutProvider: form.takeoutProvider || null,
          notes: form.notes || null,
        },
      });
      toast.success(t('saved'));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  return (
    <Dialog
      open={!!occ}
      onClose={onClose}
      title={`${contentName(occ.name, code)} · ${occ.date}`}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={submit}
            disabled={setMeal.isPending || recipeInvalid || restaurantInvalid}
          >
            {setMeal.isPending ? t('saving') : t('save')}
          </button>
        </>
      }
    >
      {meal.isLoading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="form-grid">
          <label className="field">
            <span className="field__label">{t('unassigned')}</span>
            <MemberSelect
              members={members}
              value={form.assignedMemberId}
              onChange={(id) => setForm((f) => ({ ...f, assignedMemberId: id }))}
            />
          </label>

          <label className="field">
            <span className="field__label">{t('meal_plan_type')}</span>
            <select
              className="member-select"
              value={form.planType}
              onChange={(e) =>
                setForm((f) => ({ ...f, planType: e.target.value as '' | MealPlanType }))
              }
            >
              <option value="">—</option>
              {PLAN_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(p.key)}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--full">
            <span className="field__label">{t('meal_description')}</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <label className="field field--full">
            <span className="field__label">{t('meal_recipe_url')}</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={form.recipeUrl}
              aria-invalid={recipeInvalid}
              onChange={(e) => setForm((f) => ({ ...f, recipeUrl: e.target.value }))}
            />
            {recipeInvalid && (
              <span className="field__error">{t('url_invalid')}</span>
            )}
            {!recipeInvalid && form.recipeUrl && (
              <a
                className="link-like"
                href={form.recipeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('open_recipe')} ↗
              </a>
            )}
          </label>

          <label className="field">
            <span className="field__label">{t('meal_restaurant_name')}</span>
            <input
              type="text"
              value={form.restaurantName}
              onChange={(e) =>
                setForm((f) => ({ ...f, restaurantName: e.target.value }))
              }
            />
          </label>

          <label className="field">
            <span className="field__label">{t('meal_takeout_provider')}</span>
            <input
              type="text"
              value={form.takeoutProvider}
              onChange={(e) =>
                setForm((f) => ({ ...f, takeoutProvider: e.target.value }))
              }
            />
          </label>

          <label className="field field--full">
            <span className="field__label">{t('meal_restaurant_url')}</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={form.restaurantUrl}
              aria-invalid={restaurantInvalid}
              onChange={(e) =>
                setForm((f) => ({ ...f, restaurantUrl: e.target.value }))
              }
            />
            {restaurantInvalid && (
              <span className="field__error">{t('url_invalid')}</span>
            )}
            {!restaurantInvalid && form.restaurantUrl && (
              <a
                className="link-like"
                href={form.restaurantUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('open_restaurant')} ↗
              </a>
            )}
          </label>

          <label className="field field--full">
            <span className="field__label">{t('meal_notes')}</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>
      )}
    </Dialog>
  );
}
