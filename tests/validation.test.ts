import { describe, it, expect } from 'vitest';
import {
  createMemberSchema,
  createChoreSchema,
  mealSchema,
  statusSchema,
} from '../server/src/validation/schemas';

describe('member validation', () => {
  it('requires a non-empty, trimmed name', () => {
    expect(createMemberSchema.safeParse({ name: '  ' }).success).toBe(false);
    const ok = createMemberSchema.safeParse({ name: '  Benjy  ' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.name).toBe('Benjy');
  });

  it('rejects invalid color format', () => {
    expect(createMemberSchema.safeParse({ name: 'A', color: 'red' }).success).toBe(
      false,
    );
    expect(
      createMemberSchema.safeParse({ name: 'A', color: '#4F86C6' }).success,
    ).toBe(true);
  });
});

describe('chore validation', () => {
  it('requires name, category and recurrence', () => {
    const bad = createChoreSchema.safeParse({ name: 'x' });
    expect(bad.success).toBe(false);
    const good = createChoreSchema.safeParse({
      name: 'Water plants',
      categoryId: 'cat1',
      recurrence: { frequency: 'DAILY', startDate: '2026-07-06' },
    });
    expect(good.success).toBe(true);
  });
});

describe('meal URL validation', () => {
  it('accepts http(s) URLs and empty strings', () => {
    expect(mealSchema.safeParse({ recipeUrl: 'https://example.com/r' }).success).toBe(
      true,
    );
    expect(mealSchema.safeParse({ recipeUrl: '' }).success).toBe(true);
  });

  it('rejects non-http URLs (e.g. javascript:)', () => {
    const res = mealSchema.safeParse({ recipeUrl: 'javascript:alert(1)' });
    expect(res.success).toBe(false);
  });

  it('rejects a plainly invalid URL', () => {
    expect(mealSchema.safeParse({ recipeUrl: 'not a url' }).success).toBe(false);
  });
});

describe('status validation', () => {
  it('accepts valid statuses only', () => {
    expect(statusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
    expect(statusSchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});
