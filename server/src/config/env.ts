// Environment validation. Fails fast with a clear message if required vars are
// missing, so misconfiguration is obvious rather than a cryptic runtime crash.

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (PostgreSQL connection string).'),
  HOUSEHOLD_TIMEZONE: z.string().default('Asia/Jerusalem'),
  SESSION_SECRET: z.string().default('dev-insecure-session-secret'),
  CORS_ORIGINS: z.string().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Never print the actual values; only which vars are wrong.
    console.error(
      `\n✖ Invalid environment configuration:\n${issues}\n\n` +
        `Copy .env.example to .env and fill in the values.\n`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
