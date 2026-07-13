/*
 * LOCAL VERIFICATION ONLY — not shipped, not imported by the app.
 *
 * An in-memory API that mirrors the real REST contract and reuses the REAL
 * shared recurrence engine + date utilities + DTO types. It lets us drive the
 * actual React UI in a browser without PostgreSQL. Mutations persist in memory
 * for the process lifetime. Run: tsx scripts/dev-stub-server.ts
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  occurrenceKey,
  parseOccurrenceKey,
  resolveTemplateOccurrences,
  type OverrideInput,
  type CompletionInput,
  type MealInput,
  type TemplateInput,
} from '../shared/recurrence';
import {
  startOfWeek,
  todayLocalDate,
  weekDates,
  isoWeekday,
} from '../shared/dates';
import type { WeeklyScheduleDTO } from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const TZ = 'Asia/Jerusalem';
const members = [
  { id: 'm1', name: 'Benjy', color: '#4F86C6', emoji: '🧑', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'm2', name: 'Yifat', color: '#E4739B', emoji: '👩', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'm3', name: 'Noa', color: '#5FB878', emoji: '🧒', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'm4', name: 'Adam', color: '#F0A93E', emoji: '👦', isActive: true, createdAt: '', updatedAt: '' },
];
const categories = [
  { id: 'meals', name: 'Meals', sortOrder: 0, isMealCategory: true },
  { id: 'kitchen', name: 'Kitchen', sortOrder: 1, isMealCategory: false },
  { id: 'laundry', name: 'Laundry', sortOrder: 2, isMealCategory: false },
  { id: 'pets', name: 'Pets', sortOrder: 3, isMealCategory: false },
  { id: 'other', name: 'Other', sortOrder: 4, isMealCategory: false },
];
const rule = (time: string | null) => ({
  id: 'r', frequency: 'DAILY' as const, interval: 1, daysOfWeek: [] as number[],
  startDate: '2024-01-01', endDate: null, time, isActive: true,
});
const templates: TemplateInput[] = [
  { id: 't_bf', categoryId: 'meals', name: 'Breakfast', description: null, defaultTime: '08:00', timeSlotLabel: null, sortOrder: 0, isActive: true, isMeal: true, mealType: 'BREAKFAST', rule: rule('08:00') },
  { id: 't_lu', categoryId: 'meals', name: 'Lunch', description: null, defaultTime: '13:00', timeSlotLabel: null, sortOrder: 1, isActive: true, isMeal: true, mealType: 'LUNCH', rule: rule('13:00') },
  { id: 't_di', categoryId: 'meals', name: 'Dinner', description: null, defaultTime: '19:00', timeSlotLabel: null, sortOrder: 2, isActive: true, isMeal: true, mealType: 'DINNER', rule: rule('19:00') },
  { id: 't_load', categoryId: 'kitchen', name: 'Load dishwasher', description: null, defaultTime: null, timeSlotLabel: null, sortOrder: 0, isActive: true, isMeal: false, mealType: null, rule: rule(null) },
  { id: 't_unload', categoryId: 'kitchen', name: 'Unload dishwasher', description: null, defaultTime: null, timeSlotLabel: null, sortOrder: 1, isActive: true, isMeal: false, mealType: null, rule: rule(null) },
  { id: 't_fold', categoryId: 'laundry', name: 'Fold laundry', description: null, defaultTime: null, timeSlotLabel: null, sortOrder: 0, isActive: true, isMeal: false, mealType: null, rule: rule(null) },
  { id: 't_cat', categoryId: 'pets', name: 'Feed the cat', description: null, defaultTime: '12:00', timeSlotLabel: null, sortOrder: 0, isActive: true, isMeal: false, mealType: null, rule: rule('12:00') },
  { id: 't_dogfam', categoryId: 'pets', name: 'Feed the dog — morning', description: null, defaultTime: '07:30', timeSlotLabel: 'Morning', sortOrder: 1, isActive: true, isMeal: false, mealType: null, rule: rule('07:30') },
  { id: 't_dogwalkam', categoryId: 'pets', name: 'Walk the dog — morning', description: null, defaultTime: '08:00', timeSlotLabel: 'Morning', sortOrder: 2, isActive: true, isMeal: false, mealType: null, rule: rule('08:00') },
  { id: 't_dogfpm', categoryId: 'pets', name: 'Feed the dog — evening', description: null, defaultTime: '18:00', timeSlotLabel: 'Evening', sortOrder: 3, isActive: true, isMeal: false, mealType: null, rule: rule('18:00') },
  { id: 't_dogwalkpm', categoryId: 'pets', name: 'Walk the dog — evening', description: null, defaultTime: '20:00', timeSlotLabel: 'Evening', sortOrder: 4, isActive: true, isMeal: false, mealType: null, rule: rule('20:00') },
];

const overrides = new Map<string, OverrideInput>();
const completions = new Map<string, CompletionInput>();
const meals = new Map<string, MealInput & { restaurantUrl?: string | null; takeoutProvider?: string | null; notes?: string | null }>();

app.get('/api/health', (_req, res) => res.json({ status: 'ok', db: 'stub' }));
app.get('/api/config', (_req, res) =>
  res.json({ householdId: 'h1', householdName: 'Alper Family', timezone: TZ, weekStartsOn: 'MONDAY' }));
app.get('/api/members', (_req, res) => res.json(members));
app.get('/api/categories', (_req, res) => res.json(categories));
app.post('/api/categories', (req, res) => {
  const cat = {
    id: 'cat_' + Math.random().toString(36).slice(2, 7),
    name: String(req.body?.name ?? 'New'),
    sortOrder: categories.length,
    isMealCategory: false,
  };
  categories.push(cat);
  res.status(201).json(cat);
});
app.get('/api/chores', (_req, res) =>
  res.json(templates.map((t) => ({
    id: t.id, categoryId: t.categoryId, name: t.name, description: t.description,
    defaultTime: t.defaultTime, timeSlotLabel: t.timeSlotLabel, sortOrder: t.sortOrder,
    isActive: t.isActive, isMeal: t.isMeal, mealType: t.mealType,
    recurrence: t.rule, defaultMemberId: null,
  }))));

app.get('/api/schedule', (req, res) => {
  const today = todayLocalDate(TZ);
  const weekStart = startOfWeek((req.query.weekStart as string) || today);
  const dates = weekDates(weekStart);
  const dayOcc = new Map<string, unknown[]>();
  dates.forEach((d) => dayOcc.set(d, []));
  for (const t of templates) {
    const ovByDate = new Map<string, OverrideInput>();
    const coByDate = new Map<string, CompletionInput>();
    const meByDate = new Map<string, MealInput>();
    for (const d of dates) {
      const k = occurrenceKey(t.id, d);
      if (overrides.has(k)) ovByDate.set(d, overrides.get(k)!);
      if (completions.has(k)) coByDate.set(d, completions.get(k)!);
      if (meals.has(k)) meByDate.set(d, meals.get(k)!);
    }
    const resolved = resolveTemplateOccurrences(
      { template: t, assignmentRules: [], overridesByDate: ovByDate, completionsByDate: coByDate, mealsByDate: meByDate },
      dates,
    );
    for (const r of resolved) {
      dayOcc.get(r.date)!.push({
        occurrenceKey: occurrenceKey(r.templateId, r.date), templateId: r.templateId,
        categoryId: r.categoryId, name: r.name, description: r.description, date: r.date,
        time: r.time, timeSlotLabel: r.timeSlotLabel, isMeal: r.isMeal, mealType: r.mealType,
        assignedMemberId: r.assignedMemberId, status: r.status, completedAt: r.completedAt,
        completedByMemberId: r.completedByMemberId, completionNote: r.completionNote,
        isRecurring: r.isRecurring, frequency: r.frequency, hasNotes: !!r.notes, notes: r.notes,
        mealSummary: r.isMeal ? { planType: r.meal?.planType ?? null, description: r.meal?.description ?? null, hasRecipe: !!r.meal?.recipeUrl, hasRestaurant: !!r.meal?.restaurantName } : null,
      });
    }
  }
  const curStart = startOfWeek(today);
  const out: WeeklyScheduleDTO = {
    weekStart, weekEnd: dates[6], timezone: TZ,
    isCurrentWeek: weekStart === curStart, isPastWeek: weekStart < curStart, isFutureWeek: weekStart > curStart,
    members, categories,
    days: dates.map((date) => {
      const occ = (dayOcc.get(date) as any[]).sort((a, b) => (a.time ?? '99') < (b.time ?? '99') ? -1 : 1);
      return { date, weekday: isoWeekday(date), isToday: date === today, occurrences: occ, completedCount: occ.filter((o) => o.status === 'COMPLETED').length, totalCount: occ.length };
    }),
  };
  res.json(out);
});

app.put('/api/occurrences/:key/assignment', (req, res) => {
  const p = parseOccurrenceKey(req.params.key);
  if (!p) return res.status(400).json({ error: { message: 'bad key' } });
  overrides.set(req.params.key, { occurrenceDate: p.date, assignedMemberId: req.body.memberId, hasAssignment: true, nameOverride: null, timeOverride: null, isCancelled: false, notes: overrides.get(req.params.key)?.notes ?? null });
  res.json({ ok: true });
});
app.put('/api/occurrences/:key/status', (req, res) => {
  const p = parseOccurrenceKey(req.params.key);
  if (!p) return res.status(400).json({ error: { message: 'bad key' } });
  completions.set(req.params.key, { occurrenceDate: p.date, status: req.body.status, completedAt: req.body.status === 'COMPLETED' ? new Date().toISOString() : null, completedByMemberId: null, note: null });
  res.json({ ok: true, status: req.body.status });
});
app.get('/api/occurrences/:key/meal', (req, res) => {
  const m = meals.get(req.params.key);
  res.json({ mealType: null, planType: m?.planType ?? null, assignedMemberId: m?.assignedMemberId ?? null, description: m?.description ?? null, recipeUrl: m?.recipeUrl ?? null, restaurantName: m?.restaurantName ?? null, restaurantUrl: m?.restaurantUrl ?? null, takeoutProvider: m?.takeoutProvider ?? null, notes: m?.notes ?? null });
});
app.put('/api/occurrences/:key/meal', (req, res) => {
  const p = parseOccurrenceKey(req.params.key);
  if (!p) return res.status(400).json({ error: { message: 'bad key' } });
  meals.set(req.params.key, { occurrenceDate: p.date, ...req.body });
  res.json({ ok: true });
});
app.post('/api/occurrences/:key/reset', (req, res) => {
  overrides.delete(req.params.key);
  completions.delete(req.params.key);
  res.json({ ok: true });
});
app.post('/api/chores', (req, res) => res.status(201).json({ id: 'new', ...req.body }));
app.patch('/api/members/:id', (req, res) => res.json({ ...members.find((m) => m.id === req.params.id), ...req.body }));

// Serve the built client (SPA) so we can screenshot the real UI.
const dist = path.resolve(__dirname, '../client/dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(4173, '0.0.0.0', () => console.log('stub on http://localhost:4173'));
