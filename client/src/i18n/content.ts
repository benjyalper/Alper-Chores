// Display-name translation for SEEDED content (category names, default chore
// names, time-slot labels, placeholder member names). This is a presentation
// layer only — the database keeps the canonical English names. Anything the
// user renames won't match here and is shown as-is (their own text).

const HE: Record<string, string> = {
  // Household
  'Alper Family': 'משפחת אלפר',

  // Categories
  Meals: 'ארוחות',
  Kitchen: 'מטבח',
  Laundry: 'כביסה',
  Pets: 'חיות מחמד',
  Other: 'אחר',

  // Meal chores
  Breakfast: 'ארוחת בוקר',
  Lunch: 'ארוחת צהריים',
  Dinner: 'ארוחת ערב',

  // Kitchen
  'Load dishwasher': 'הכנסת כלים למדיח',
  'Unload dishwasher': 'הוצאת כלים מהמדיח',

  // Laundry
  'Fold laundry': 'קיפול כביסה',
  'Put folded laundry in rooms': 'חלוקת כביסה מקופלת לחדרים',

  // Pets
  'Feed the cat': 'האכלת החתול',
  'Feed the dog — morning': 'האכלת הכלב — בוקר',
  'Feed the dog — evening': 'האכלת הכלב — ערב',
  'Walk the dog — morning': 'טיול עם הכלב — בוקר',
  'Walk the dog — evening': 'טיול עם הכלב — ערב',

  // Time-slot labels
  Morning: 'בוקר',
  Evening: 'ערב',

  // Placeholder members
  'Family Member 1': 'בן משפחה 1',
  'Family Member 2': 'בן משפחה 2',
  'Family Member 3': 'בן משפחה 3',
  'Family Member 4': 'בן משפחה 4',
};

/** Translate a known seeded content name for display; otherwise return as-is. */
export function contentName(
  name: string | null | undefined,
  code: string,
): string {
  if (!name) return name ?? '';
  if (code === 'he') return HE[name] ?? name;
  return name;
}
