// Shared domain types — mirrored between the Express API and the React client.
// Keep this framework-free so both sides can import it directly.

export type WeekStart = 'MONDAY' | 'SUNDAY';
export type Frequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_WEEKLY';
export type CompletionStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';
export type MealPlanType =
  | 'HOME_COOKED'
  | 'RESTAURANT'
  | 'TAKEOUT'
  | 'LEFTOVERS'
  | 'OTHER';

/** Scope for an assignment change. */
export type AssignmentScope =
  | 'occurrence'
  | 'rest-of-week'
  | 'this-and-future'
  | 'entire-series';

/** Scope for editing an occurrence that belongs to a recurring series. */
export type EditScope = 'occurrence' | 'this-and-future' | 'entire-series';

export interface FamilyMemberDTO {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  sortOrder: number;
  isMealCategory: boolean;
}

export interface RecurrenceRuleDTO {
  id: string;
  frequency: Frequency;
  interval: number;
  daysOfWeek: number[];
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string | null;
  time: string | null;
  timezone: string;
  isActive: boolean;
}

export interface ChoreTemplateDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  defaultTime: string | null;
  timeSlotLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  isMeal: boolean;
  mealType: MealType | null;
  recurrence: RecurrenceRuleDTO | null;
  defaultMemberId: string | null;
}

export interface MealSummaryDTO {
  planType: MealPlanType | null;
  description: string | null;
  hasRecipe: boolean;
  hasRestaurant: boolean;
}

export interface MealPlanDTO {
  mealType: MealType;
  planType: MealPlanType | null;
  assignedMemberId: string | null;
  description: string | null;
  recipeUrl: string | null;
  restaurantName: string | null;
  restaurantUrl: string | null;
  takeoutProvider: string | null;
  notes: string | null;
}

/** A single generated chore occurrence for a specific local date. */
export interface OccurrenceDTO {
  occurrenceKey: string; // `${templateId}__${date}`
  templateId: string;
  categoryId: string;
  name: string;
  description: string | null;
  date: string; // ISO local date
  time: string | null;
  timeSlotLabel: string | null;
  isMeal: boolean;
  mealType: MealType | null;
  assignedMemberId: string | null;
  status: CompletionStatus;
  completedAt: string | null;
  completedByMemberId: string | null;
  completionNote: string | null;
  isRecurring: boolean;
  frequency: Frequency | null;
  hasNotes: boolean;
  notes: string | null;
  mealSummary: MealSummaryDTO | null;
}

export interface ScheduleDayDTO {
  date: string; // ISO local date
  weekday: number; // 1=Mon .. 7=Sun
  isToday: boolean;
  occurrences: OccurrenceDTO[];
  completedCount: number;
  totalCount: number;
}

export interface WeeklyScheduleDTO {
  weekStart: string; // ISO local date (Monday)
  weekEnd: string; // ISO local date (Sunday)
  timezone: string;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
  members: FamilyMemberDTO[];
  categories: CategoryDTO[];
  days: ScheduleDayDTO[];
}

export interface ConfigDTO {
  householdId: string;
  householdName: string;
  timezone: string;
  weekStartsOn: WeekStart;
}

export interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}
