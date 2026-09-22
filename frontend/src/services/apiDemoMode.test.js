/**
 * Phase 5 (6.2): demo-mode gating. With VITE_DEMO_MODE=true, backend
 * failures yield explicitly marked ({ __demo: true }) simulated data.
 * Without it, the same failure throws.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubEnv('VITE_DEMO_MODE', 'true');
  vi.resetModules();
});

describe('demo-mode gating', () => {
  it('demo mode marks simulated case data instead of throwing', async () => {
    const api = await import('./api.js?demo-mode');
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const res = await api.fetchWelfareCases();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].__demo).toBe(true);
  });

  it('normal mode throws for the same failure', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    const api = await import('./api.js?normal-mode');
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(api.fetchWelfareCases()).rejects.toThrow(/Backend unavailable/);
  });
});
