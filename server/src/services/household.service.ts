// Version 1 has a single household. This helper resolves it (and caches the id).

import { prisma } from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

let cachedId: string | null = null;

export async function getHousehold() {
  const household = await prisma.household.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!household) {
    throw new HttpError(
      500,
      'No household found. Run the seed command (npm run prisma:seed).',
      'NO_HOUSEHOLD',
    );
  }
  cachedId = household.id;
  return household;
}

export async function getHouseholdId(): Promise<string> {
  if (cachedId) return cachedId;
  const h = await getHousehold();
  return h.id;
}
