// @vitest-environment jsdom
/**
 * Phase 5 (6.2): API client critical states in NORMAL mode
 * (VITE_DEMO_MODE unset → false). Backend failures must throw visible
 * errors and never fabricate responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loginWithCredentials,
  fetchWelfareCases,
  submitEscalation,
  executeBreakGlass,
  fetchCustodiansInfo
} from './api.js';

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = vi.fn();
});

function networkDown() {
  global.fetch.mockRejectedValue(new TypeError('fetch failed'));
}

describe('normal-mode failure visibility', () => {
  it('login throws visibly when the backend is down (no mock login)', async () => {
    networkDown();
    await expect(loginWithCredentials('Test', 'WO-7742', 'x')).rejects.toThrow(
      /Backend unavailable/
    );
    expect(window.localStorage.getItem('sahayak_access_token')).toBeNull();
  });

  it('case fetch throws instead of returning hardcoded cases', async () => {
    networkDown();
    await expect(fetchWelfareCases()).rejects.toThrow(/Backend unavailable/);
  });

  it('escalation never fabricates a CASE-LOCAL id on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(
      submitEscalation({ pseudonym_id: 'p', tier: 'elevated', client_event_id: 'e1' })
    ).rejects.toThrow();
  });

  it('break-glass denial propagates the backend message', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Custodian 1 verification failed. Access denied.' })
    });
    await expect(
      executeBreakGlass({ case_id: 'C', pseudonym_id: 'p' })
    ).rejects.toThrow(/Custodian 1 verification failed/);
  });

  it('custodian directory passes through with no injected PINs', async () => {
    const payload = { authorized_custodians: [{ id: 'WO_7742', role: 'welfare_officer' }] };
    global.fetch.mockResolvedValue({ ok: true, json: async () => payload });
    const res = await fetchCustodiansInfo();
    expect(JSON.stringify(res)).not.toMatch(/9481|demo_pin/);
  });

  it('successful responses are returned untouched', async () => {
    const cases = [{ case_id: 'CASE-REAL-1', tier: 'elevated' }];
    global.fetch.mockResolvedValue({ ok: true, json: async () => cases });
    await expect(fetchWelfareCases()).resolves.toEqual(cases);
  });
});
