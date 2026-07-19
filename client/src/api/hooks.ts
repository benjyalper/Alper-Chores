// React Query hooks for all API resources. Handles refetch-on-focus, periodic
// refresh, and cache invalidation after mutations.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  CategoryDTO,
  ChoreTemplateDTO,
  ConfigDTO,
  FamilyMemberDTO,
  MealPlanDTO,
  WeeklyScheduleDTO,
  AssignmentScope,
  CompletionStatus,
  ResetScope,
} from '@shared/types';

// ---- Config ----------------------------------------------------------------

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<ConfigDTO>('/config'),
    staleTime: 60 * 60 * 1000,
  });
}

// ---- Schedule --------------------------------------------------------------

export function useSchedule(weekStart?: string) {
  return useQuery({
    queryKey: ['schedule', weekStart ?? 'current'],
    queryFn: () =>
      api.get<WeeklyScheduleDTO>(
        `/schedule${weekStart ? `?weekStart=${weekStart}` : ''}`,
      ),
    // Lightweight periodic refresh while the page is open + refetch on focus.
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateSchedule() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['schedule'] });
}

export interface AssignmentVars {
  occurrenceKey: string;
  memberId: string | null;
  scope: AssignmentScope;
}

export function useSetAssignment() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: (v: AssignmentVars) =>
      api.put(`/occurrences/${encodeURIComponent(v.occurrenceKey)}/assignment`, {
        memberId: v.memberId,
        scope: v.scope,
      }),
    onSuccess: () => invalidate(),
  });
}

export interface StatusVars {
  occurrenceKey: string;
  status: CompletionStatus;
  completedByMemberId?: string | null;
}

export function useSetStatus() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: (v: StatusVars) =>
      api.put(`/occurrences/${encodeURIComponent(v.occurrenceKey)}/status`, {
        status: v.status,
        completedByMemberId: v.completedByMemberId ?? null,
      }),
    onSuccess: () => invalidate(),
  });
}

export function useResetOccurrence() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: (v: { occurrenceKey: string; scope: ResetScope }) =>
      api.post(`/occurrences/${encodeURIComponent(v.occurrenceKey)}/reset`, {
        scope: v.scope,
      }),
    onSuccess: () => invalidate(),
  });
}

// ---- Meals -----------------------------------------------------------------

export function useMeal(occurrenceKey: string | null) {
  return useQuery({
    queryKey: ['meal', occurrenceKey],
    queryFn: () =>
      api.get<MealPlanDTO & { occurrenceKey: string }>(
        `/occurrences/${encodeURIComponent(occurrenceKey!)}/meal`,
      ),
    enabled: !!occurrenceKey,
  });
}

export function useSetMeal() {
  const invalidate = useInvalidateSchedule();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { occurrenceKey: string; data: Partial<MealPlanDTO> }) =>
      api.put(`/occurrences/${encodeURIComponent(v.occurrenceKey)}/meal`, v.data),
    onSuccess: (_d, v) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['meal', v.occurrenceKey] });
    },
  });
}

// ---- Members ---------------------------------------------------------------

export function useMembers(includeInactive = true) {
  return useQuery({
    queryKey: ['members', includeInactive],
    queryFn: () =>
      api.get<FamilyMemberDTO[]>(`/members?includeInactive=${includeInactive}`),
  });
}

export function useMemberMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['members'] });
    qc.invalidateQueries({ queryKey: ['schedule'] });
  };
  const create = useMutation({
    mutationFn: (v: { body: unknown; force?: boolean }) =>
      api.post<FamilyMemberDTO>(`/members${v.force ? '?force=true' : ''}`, v.body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: unknown }) =>
      api.patch<FamilyMemberDTO>(`/members/${v.id}`, v.body),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (v: { id: string; body: unknown }) =>
      api.post<FamilyMemberDTO>(`/members/${v.id}/deactivate`, v.body),
    onSuccess: invalidate,
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => api.post<FamilyMemberDTO>(`/members/${id}/reactivate`),
    onSuccess: invalidate,
  });
  return { create, update, deactivate, reactivate };
}

// ---- Categories ------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDTO[]>('/categories'),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<CategoryDTO>('/categories', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

// ---- Chores ----------------------------------------------------------------

export function useChores(includeInactive = true) {
  return useQuery({
    queryKey: ['chores', includeInactive],
    queryFn: () =>
      api.get<ChoreTemplateDTO[]>(`/chores?includeInactive=${includeInactive}`),
  });
}

export function useChoreMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['chores'] });
    qc.invalidateQueries({ queryKey: ['schedule'] });
  };
  const create = useMutation({
    mutationFn: (body: unknown) => api.post<ChoreTemplateDTO>('/chores', body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: unknown }) =>
      api.patch<ChoreTemplateDTO>(`/chores/${v.id}`, v.body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/chores/${id}`),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}
