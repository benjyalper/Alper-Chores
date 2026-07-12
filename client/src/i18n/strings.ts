// Centralized user-facing strings. Adding Hebrew later means adding a second
// dictionary with the same keys and a `dir: 'rtl'` flag — no component rewrites.

export type Dir = 'ltr' | 'rtl';

export interface Locale {
  code: string;
  dir: Dir;
  t: Record<string, string>;
}

const en: Record<string, string> = {
  appName: 'Alper Chores',
  nav_schedule: 'Schedule',
  nav_members: 'Family',
  nav_chores: 'Chores',
  nav_settings: 'Settings',

  week_prev: 'Previous week',
  week_this: 'This week',
  week_next: 'Next week',
  week_current: 'This week',
  week_past: 'Past week',
  week_future: 'Upcoming week',
  today: 'Today',

  add_chore: 'Add chore',
  unassigned: 'Unassigned',
  not_planned: 'Not planned',

  status_pending: 'Pending',
  status_completed: 'Completed',
  status_skipped: 'Skipped',
  mark_done: 'Mark done',
  mark_skipped: 'Skip',
  reopen: 'Reopen',

  save: 'Save',
  cancel: 'Cancel',
  saving: 'Saving…',
  saved: 'Saved',
  save_failed: 'Could not save. Please try again.',
  loading: 'Loading…',
  retry: 'Retry',
  delete: 'Delete',
  edit: 'Edit',

  meal_title: 'Meal details',
  meal_plan_type: 'Meal plan',
  meal_home: 'Home-cooked',
  meal_restaurant: 'Restaurant',
  meal_takeout: 'Takeout / delivery',
  meal_leftovers: 'Leftovers',
  meal_other: 'Other',
  meal_description: 'What are you having?',
  meal_recipe_url: 'Recipe link',
  meal_restaurant_name: 'Restaurant name',
  meal_restaurant_url: 'Restaurant link',
  meal_takeout_provider: 'Takeout provider',
  meal_notes: 'Notes',
  open_recipe: 'Open recipe',
  open_restaurant: 'Open restaurant',

  member_add: 'Add family member',
  member_name: 'Name',
  member_color: 'Color',
  member_emoji: 'Emoji',
  member_active: 'Active',
  member_deactivate: 'Deactivate',
  member_reactivate: 'Reactivate',
  member_inactive_label: 'Inactive',

  scope_question: 'Apply this change to…',
  scope_occurrence: 'This occurrence only',
  scope_rest_of_week: 'The rest of this week',
  scope_this_and_future: 'This and future weeks',
  scope_entire_series: 'The entire series',

  empty_day: 'This day is all organized.',
  empty_no_assignee: 'No one is assigned yet.',
  empty_no_custom: 'No custom chores have been added.',
  empty_members: 'No family members yet.',

  offline: "You're offline — showing the last loaded data. Changes can't be saved.",
  install_hint: 'Install Alper Chores on your device for quick access.',
  install: 'Install',
  dismiss: 'Dismiss',

  chore_name: 'Chore name',
  category: 'Category',
  description: 'Description',
  time: 'Time',
  time_slot: 'Time slot label',
  recurrence: 'Repeats',
  freq_once: 'Once',
  freq_daily: 'Every day',
  freq_weekly: 'Weekly',
  freq_custom: 'Selected weekdays',
  start_date: 'Start date',
  end_date: 'End date (optional)',
  default_assignee: 'Default assignee',
  is_meal: 'This is a meal',
  weekly_progress: 'Weekly progress',
};

export const locales: Record<string, Locale> = {
  en: { code: 'en', dir: 'ltr', t: en },
};

export const defaultLocale = locales.en;
