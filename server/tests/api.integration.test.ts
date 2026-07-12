// API integration tests. These exercise the real Express app against a real
// PostgreSQL database, so they only run when TEST_DATABASE_URL is provided
// (e.g. in CI). They are skipped locally when no test DB is configured — they
// must NEVER touch the production Railway database.
//
// Setup (once):
//   TEST_DATABASE_URL=postgresql://... \
//   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && \
//   DATABASE_URL=$TEST_DATABASE_URL npm run prisma:seed
//   TEST_DATABASE_URL=postgresql://... npm test

import { describe, it, expect, beforeAll } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
const run = TEST_DB ? describe : describe.skip;

run('API integration', () => {
  let app: import('express').Express;
  let request: typeof import('supertest');

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.NODE_ENV = 'test';
    const { createApp } = await import('../src/app');
    app = createApp();
    // supertest is optional; only needed when integration tests actually run.
    request = (await import('supertest')).default;
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/members returns the seeded four members', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/schedule returns a Monday–Sunday week with occurrences', async () => {
    const res = await request(app).get('/api/schedule?weekStart=2026-07-06');
    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe('2026-07-06');
    expect(res.body.weekEnd).toBe('2026-07-12');
    expect(res.body.days).toHaveLength(7);
    // Seeded daily chores should appear every day.
    expect(res.body.days[0].occurrences.length).toBeGreaterThan(0);
  });

  it('assigns a member to an occurrence and it persists', async () => {
    const sched = await request(app).get('/api/schedule?weekStart=2026-07-06');
    const occ = sched.body.days[0].occurrences[0];
    const memberId = sched.body.members[0].id;
    const put = await request(app)
      .put(`/api/occurrences/${encodeURIComponent(occ.occurrenceKey)}/assignment`)
      .send({ memberId, scope: 'occurrence' });
    expect(put.status).toBe(200);

    const after = await request(app).get('/api/schedule?weekStart=2026-07-06');
    const again = after.body.days[0].occurrences.find(
      (o: { occurrenceKey: string }) => o.occurrenceKey === occ.occurrenceKey,
    );
    expect(again.assignedMemberId).toBe(memberId);
  });

  it('rejects an invalid recipe URL on a meal', async () => {
    const sched = await request(app).get('/api/schedule?weekStart=2026-07-06');
    const meal = sched.body.days[0].occurrences.find(
      (o: { isMeal: boolean }) => o.isMeal,
    );
    const res = await request(app)
      .put(`/api/occurrences/${encodeURIComponent(meal.occurrenceKey)}/meal`)
      .send({ recipeUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });
});
