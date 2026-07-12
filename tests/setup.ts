// Global test setup. Loads jest-dom matchers only when running in a DOM
// environment (client component tests); no-op for pure node tests.
import { afterEach } from 'vitest';

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());
}
