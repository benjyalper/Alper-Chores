// Idempotent seed for Alper Chores.
// Safe to run repeatedly: uses stable ids / seedKeys and upserts, and never
// deletes user-created data. Run with: npm run prisma:seed

import { PrismaClient, type Frequency, type MealType } from '@prisma/client';

const prisma = new PrismaClient();

const TZ = process.env.HOUSEHOLD_TIMEZONE || 'Asia/Jerusalem';
const HOUSEHOLD_ID = 'household_alper';
// A Monday, safely in the past, so DAILY rules fire for every date.
const START_DATE = new Date('2024-01-01T00:00:00.000Z');

interface SeedTemplate {
  seedKey: string;
  name: string;
  categoryKey: string;
  defaultTime?: string;
  timeSlotLabel?: string;
  isMeal?: boolean;
  mealType?: MealType;
  frequency?: Frequency;
  sortOrder: number;
}

const CATEGORIES = [
  { name: 'Meals', sortOrder: 0, isMealCategory: true },
  { name: 'Kitchen', sortOrder: 1, isMealCategory: false },
  { name: 'Laundry', sortOrder: 2, isMealCategory: false },
  { name: 'Pets', sortOrder: 3, isMealCategory: false },
  { name: 'Other', sortOrder: 4, isMealCategory: false },
];

const TEMPLATES: SeedTemplate[] = [
  // Meals — every day
  { seedKey: 'meal_breakfast', name: 'Breakfast', categoryKey: 'Meals', isMeal: true, mealType: 'BREAKFAST', defaultTime: '08:00', sortOrder: 0 },
  { seedKey: 'meal_lunch', name: 'Lunch', categoryKey: 'Meals', isMeal: true, mealType: 'LUNCH', defaultTime: '13:00', sortOrder: 1 },
  { seedKey: 'meal_dinner', name: 'Dinner', categoryKey: 'Meals', isMeal: true, mealType: 'DINNER', defaultTime: '19:00', sortOrder: 2 },
  // Kitchen — every day
  { seedKey: 'kitchen_load', name: 'Load dishwasher', categoryKey: 'Kitchen', sortOrder: 0 },
  { seedKey: 'kitchen_unload', name: 'Unload dishwasher', categoryKey: 'Kitchen', sortOrder: 1 },
  // Laundry — every day
  { seedKey: 'laundry_fold', name: 'Fold laundry', categoryKey: 'Laundry', sortOrder: 0 },
  { seedKey: 'laundry_putaway', name: 'Put folded laundry in rooms', categoryKey: 'Laundry', sortOrder: 1 },
  // Pets — cat
  { seedKey: 'pet_cat_feed', name: 'Feed the cat', categoryKey: 'Pets', defaultTime: '12:00', sortOrder: 0 },
  // Pets — dog (explicit morning/evening slots)
  { seedKey: 'pet_dog_feed_am', name: 'Feed the dog — morning', categoryKey: 'Pets', defaultTime: '07:30', timeSlotLabel: 'Morning', sortOrder: 1 },
  { seedKey: 'pet_dog_walk_am', name: 'Walk the dog — morning', categoryKey: 'Pets', defaultTime: '08:00', timeSlotLabel: 'Morning', sortOrder: 2 },
  { seedKey: 'pet_dog_feed_pm', name: 'Feed the dog — evening', categoryKey: 'Pets', defaultTime: '18:00', timeSlotLabel: 'Evening', sortOrder: 3 },
  { seedKey: 'pet_dog_walk_pm', name: 'Walk the dog — evening', categoryKey: 'Pets', defaultTime: '20:00', timeSlotLabel: 'Evening', sortOrder: 4 },
];

const MEMBERS = [
  { id: 'member_1', name: 'Family Member 1', color: '#4F86C6', emoji: '🧑' },
  { id: 'member_2', name: 'Family Member 2', color: '#E4739B', emoji: '👩' },
  { id: 'member_3', name: 'Family Member 3', color: '#5FB878', emoji: '🧒' },
  { id: 'member_4', name: 'Family Member 4', color: '#F0A93E', emoji: '👦' },
];

async function main() {
  console.log('Seeding Alper Chores...');

  // Household
  await prisma.household.upsert({
    where: { id: HOUSEHOLD_ID },
    update: { name: 'Alper Family', timezone: TZ, weekStartsOn: 'SUNDAY' },
    create: { id: HOUSEHOLD_ID, name: 'Alper Family', timezone: TZ, weekStartsOn: 'SUNDAY' },
  });

  // Members (placeholders, editable by the user)
  for (const m of MEMBERS) {
    await prisma.familyMember.upsert({
      where: { id: m.id },
      update: {}, // do not overwrite renames on re-seed
      create: { id: m.id, householdId: HOUSEHOLD_ID, name: m.name, color: m.color, emoji: m.emoji },
    });
  }

  // Categories
  const categoryIdByName = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.choreCategory.upsert({
      where: { householdId_name: { householdId: HOUSEHOLD_ID, name: c.name } },
      update: { sortOrder: c.sortOrder, isMealCategory: c.isMealCategory },
      create: {
        householdId: HOUSEHOLD_ID,
        name: c.name,
        sortOrder: c.sortOrder,
        isMealCategory: c.isMealCategory,
      },
    });
    categoryIdByName.set(c.name, cat.id);
  }

  // Templates + one DAILY recurrence rule each (created only if missing)
  for (const t of TEMPLATES) {
    const categoryId = categoryIdByName.get(t.categoryKey)!;
    const template = await prisma.choreTemplate.upsert({
      where: { householdId_seedKey: { householdId: HOUSEHOLD_ID, seedKey: t.seedKey } },
      update: {
        name: t.name,
        categoryId,
        defaultTime: t.defaultTime ?? null,
        timeSlotLabel: t.timeSlotLabel ?? null,
        isMeal: t.isMeal ?? false,
        mealType: t.mealType ?? null,
        sortOrder: t.sortOrder,
      },
      create: {
        householdId: HOUSEHOLD_ID,
        seedKey: t.seedKey,
        categoryId,
        name: t.name,
        defaultTime: t.defaultTime ?? null,
        timeSlotLabel: t.timeSlotLabel ?? null,
        isMeal: t.isMeal ?? false,
        mealType: t.mealType ?? null,
        sortOrder: t.sortOrder,
      },
    });

    const existingRule = await prisma.recurrenceRule.findFirst({
      where: { choreTemplateId: template.id },
    });
    if (!existingRule) {
      await prisma.recurrenceRule.create({
        data: {
          choreTemplateId: template.id,
          frequency: t.frequency ?? 'DAILY',
          interval: 1,
          daysOfWeek: [],
          startDate: START_DATE,
          time: t.defaultTime ?? null,
          timezone: TZ,
        },
      });
    }
  }

  // Repair: an earlier "delete this and following weeks" bug could split a
  // template into TWO active recurrence rules (capping the first, adding a
  // second). The app only ever reads the first rule, so the chore silently
  // vanished for future weeks. The model is one-rule-per-template, so collapse
  // any template back to a single active rule and clear the endDate the bug set.
  // Idempotent: templates already having a single rule are untouched.
  const allTemplates = await prisma.choreTemplate.findMany({
    where: { householdId: HOUSEHOLD_ID },
    select: { id: true },
  });
  let repaired = 0;
  for (const tpl of allTemplates) {
    const rules = await prisma.recurrenceRule.findMany({
      where: { choreTemplateId: tpl.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (rules.length <= 1) continue;
    const [keep, ...extra] = rules;
    // Extra rules cascade-delete their assignment rules; keep the original and
    // reopen it (endDate null) so it fires on every future week again.
    await prisma.recurrenceRule.deleteMany({ where: { id: { in: extra.map((r) => r.id) } } });
    if (keep.endDate) {
      await prisma.recurrenceRule.update({ where: { id: keep.id }, data: { endDate: null } });
    }
    repaired += 1;
  }
  if (repaired > 0) console.log(`✔ Repaired ${repaired} split recurrence rule(s)`);

  // The old delete also hid single days via cancelled overrides. There is no
  // user-facing "cancel occurrence" feature, so any such rows are from that bug
  // — un-hide them so those days come back.
  const uncancelled = await prisma.choreOccurrenceOverride.updateMany({
    where: { isCancelled: true },
    data: { isCancelled: false },
  });
  if (uncancelled.count > 0) console.log(`✔ Un-hid ${uncancelled.count} cancelled day(s)`);

  const counts = {
    members: await prisma.familyMember.count(),
    categories: await prisma.choreCategory.count(),
    templates: await prisma.choreTemplate.count(),
    rules: await prisma.recurrenceRule.count(),
  };
  console.log('✔ Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
