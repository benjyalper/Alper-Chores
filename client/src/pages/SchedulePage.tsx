import { useState } from 'react';
import type {
  AssignmentScope,
  OccurrenceDTO,
} from '@shared/types';
import { addLocalDays, startOfWeek, todayLocalDate } from '@shared/dates';
import {
  useSchedule,
  useSetAssignment,
  useSetStatus,
  useChoreMutations,
  useCategories,
} from '../api/hooks';
import { useConfig } from '../api/hooks';
import { WeekNav } from '../features/schedule/WeekNav';
import { DesktopGrid } from '../features/schedule/DesktopGrid';
import { MobileDay } from '../features/schedule/MobileDay';
import { MealDialog } from '../features/schedule/MealDialog';
import { ChoreForm, type ChoreFormValue } from '../features/schedule/ChoreForm';
import { ScheduleSkeleton } from '../components/Skeletons';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../components/Toast';

export function SchedulePage() {
  const { t } = useI18n();
  const toast = useToast();
  const isMobile = useIsMobile();
  const config = useConfig();
  const tz = config.data?.timezone ?? 'Asia/Jerusalem';

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(todayLocalDate(tz)),
  );
  const schedule = useSchedule(weekStart);
  const categories = useCategories();
  const setAssignment = useSetAssignment();
  const setStatus = useSetStatus();
  const { create } = useChoreMutations();

  const [mealOcc, setMealOcc] = useState<OccurrenceDTO | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const members = schedule.data?.members ?? [];

  const handleAssign = async (
    occ: OccurrenceDTO,
    memberId: string | null,
    scope: AssignmentScope,
  ) => {
    try {
      await setAssignment.mutateAsync({
        occurrenceKey: occ.occurrenceKey,
        memberId,
        scope,
      });
      toast.success(t('saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const handleStatus = async (occ: OccurrenceDTO, status: OccurrenceDTO['status']) => {
    try {
      await setStatus.mutateAsync({ occurrenceKey: occ.occurrenceKey, status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  const handleCreateChore = async (v: ChoreFormValue) => {
    try {
      await create.mutateAsync({
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
      toast.success(t('saved'));
      setAddOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('save_failed'));
    }
  };

  return (
    <div className="page">
      <div className="page__toolbar">
        <h1 className="page__title">{t('nav_schedule')}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setAddOpen(true)}
          disabled={!categories.data?.length}
        >
          + {t('add_chore')}
        </button>
      </div>

      {schedule.isError ? (
        <div className="error-block" role="alert">
          <p>{(schedule.error as Error)?.message ?? 'Failed to load schedule.'}</p>
          <button className="btn btn--ghost" onClick={() => schedule.refetch()}>
            {t('retry')}
          </button>
        </div>
      ) : schedule.isLoading || !schedule.data ? (
        <ScheduleSkeleton />
      ) : (
        <>
          <WeekNav
            schedule={schedule.data}
            onPrev={() => setWeekStart((w) => addLocalDays(w, -7))}
            onThis={() => setWeekStart(startOfWeek(todayLocalDate(tz)))}
            onNext={() => setWeekStart((w) => addLocalDays(w, 7))}
          />
          {isMobile ? (
            <MobileDay
              schedule={schedule.data}
              members={members}
              onAssign={handleAssign}
              onStatus={handleStatus}
              onOpenMeal={setMealOcc}
            />
          ) : (
            <DesktopGrid
              schedule={schedule.data}
              members={members}
              onAssign={handleAssign}
              onStatus={handleStatus}
              onOpenMeal={setMealOcc}
            />
          )}
        </>
      )}

      <MealDialog occ={mealOcc} members={members} onClose={() => setMealOcc(null)} />

      {addOpen && categories.data && (
        <ChoreForm
          open={addOpen}
          title={t('add_chore')}
          onClose={() => setAddOpen(false)}
          onSubmit={handleCreateChore}
          categories={categories.data}
          members={members}
          defaultDate={weekStart}
          submitting={create.isPending}
        />
      )}
    </div>
  );
}
