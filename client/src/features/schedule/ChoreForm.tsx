import { useState } from 'react';
import type {
  CategoryDTO,
  ChoreTemplateDTO,
  FamilyMemberDTO,
  Frequency,
  MealType,
} from '@shared/types';
import { Dialog } from '../../components/Dialog';
import { MemberSelect } from '../../components/MemberSelect';
import { useI18n } from '../../i18n/I18nContext';
import { contentName } from '../../i18n/content';
import { isoWeekdayShort } from '../../utils/format';

export interface ChoreFormValue {
  name: string;
  categoryId: string;
  description: string;
  defaultTime: string;
  timeSlotLabel: string;
  isMeal: boolean;
  mealType: MealType | '';
  defaultMemberId: string | null;
  recurrence: {
    frequency: Frequency;
    interval: number;
    daysOfWeek: number[];
    startDate: string;
    endDate: string;
    time: string;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: ChoreFormValue) => Promise<void> | void;
  categories: CategoryDTO[];
  members: FamilyMemberDTO[];
  defaultDate: string;
  initial?: ChoreTemplateDTO;
  submitting?: boolean;
  title: string;
}

const WEEKDAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

export function ChoreForm({
  open,
  onClose,
  onSubmit,
  categories,
  members,
  defaultDate,
  initial,
  submitting,
  title,
}: Props) {
  const { t, code } = useI18n();
  const [value, setValue] = useState<ChoreFormValue>(() => ({
    name: initial?.name ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    description: initial?.description ?? '',
    defaultTime: initial?.defaultTime ?? '',
    timeSlotLabel: initial?.timeSlotLabel ?? '',
    isMeal: initial?.isMeal ?? false,
    mealType: (initial?.mealType ?? '') as MealType | '',
    defaultMemberId: initial?.defaultMemberId ?? null,
    recurrence: {
      frequency: initial?.recurrence?.frequency ?? 'DAILY',
      interval: initial?.recurrence?.interval ?? 1,
      daysOfWeek: initial?.recurrence?.daysOfWeek ?? [],
      startDate: initial?.recurrence?.startDate ?? defaultDate,
      endDate: initial?.recurrence?.endDate ?? '',
      time: initial?.recurrence?.time ?? '',
    },
  }));

  const set = <K extends keyof ChoreFormValue>(k: K, v: ChoreFormValue[K]) =>
    setValue((s) => ({ ...s, [k]: v }));
  const setRec = <K extends keyof ChoreFormValue['recurrence']>(
    k: K,
    v: ChoreFormValue['recurrence'][K],
  ) => setValue((s) => ({ ...s, recurrence: { ...s.recurrence, [k]: v } }));

  const toggleDay = (n: number) =>
    setRec(
      'daysOfWeek',
      value.recurrence.daysOfWeek.includes(n)
        ? value.recurrence.daysOfWeek.filter((d) => d !== n)
        : [...value.recurrence.daysOfWeek, n].sort(),
    );

  const canSubmit = value.name.trim() && value.categoryId;
  const freq = value.recurrence.frequency;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit(value)}
          >
            {submitting ? t('saving') : t('save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field field--full">
          <span className="field__label">{t('chore_name')} *</span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">{t('category')}</span>
          <select
            className="member-select"
            value={value.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {contentName(c.name, code)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('default_assignee')}</span>
          <MemberSelect
            members={members}
            value={value.defaultMemberId}
            onChange={(id) => set('defaultMemberId', id)}
          />
        </label>

        <label className="field field--full">
          <span className="field__label">{t('description')}</span>
          <input
            type="text"
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('time')}</span>
          <input
            type="time"
            value={value.defaultTime}
            onChange={(e) => {
              set('defaultTime', e.target.value);
              setRec('time', e.target.value);
            }}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('time_slot')}</span>
          <input
            type="text"
            placeholder={t('slot_placeholder')}
            value={value.timeSlotLabel}
            onChange={(e) => set('timeSlotLabel', e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('recurrence')}</span>
          <select
            className="member-select"
            value={freq}
            onChange={(e) => setRec('frequency', e.target.value as Frequency)}
          >
            <option value="ONCE">{t('freq_once')}</option>
            <option value="DAILY">{t('freq_daily')}</option>
            <option value="WEEKLY">{t('freq_weekly')}</option>
            <option value="CUSTOM_WEEKLY">{t('freq_custom')}</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('start_date')}</span>
          <input
            type="date"
            value={value.recurrence.startDate}
            onChange={(e) => setRec('startDate', e.target.value)}
          />
        </label>

        {(freq === 'WEEKLY' || freq === 'CUSTOM_WEEKLY') && (
          <fieldset className="field field--full weekday-picker">
            <legend className="field__label">{t('weekdays_legend')}</legend>
            <div className="weekday-row">
              {WEEKDAY_NUMBERS.map((n) => (
                <label key={n} className="weekday">
                  <input
                    type="checkbox"
                    checked={value.recurrence.daysOfWeek.includes(n)}
                    onChange={() => toggleDay(n)}
                  />
                  <span>{isoWeekdayShort(n, code)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="field">
          <span className="field__label">{t('end_date')}</span>
          <input
            type="date"
            value={value.recurrence.endDate}
            onChange={(e) => setRec('endDate', e.target.value)}
          />
        </label>

        <label className="field field--checkbox field--full">
          <input
            type="checkbox"
            checked={value.isMeal}
            onChange={(e) => set('isMeal', e.target.checked)}
          />
          <span>{t('is_meal')}</span>
        </label>

        {value.isMeal && (
          <label className="field">
            <span className="field__label">{t('mealtype_label')}</span>
            <select
              className="member-select"
              value={value.mealType}
              onChange={(e) => set('mealType', e.target.value as MealType | '')}
            >
              <option value="">—</option>
              <option value="BREAKFAST">{t('mealtype_breakfast')}</option>
              <option value="LUNCH">{t('mealtype_lunch')}</option>
              <option value="DINNER">{t('mealtype_dinner')}</option>
            </select>
          </label>
        )}
      </div>
    </Dialog>
  );
}
