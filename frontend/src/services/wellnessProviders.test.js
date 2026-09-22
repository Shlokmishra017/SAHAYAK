/**
 * Phase 5 (6.2): wellness providers — self-reported only, wearable stub
 * refuses to fabricate data.
 */
import { describe, it, expect } from 'vitest';
import { SelfReportedProvider, WearableProvider } from './wellnessProviders.js';

describe('wellness providers', () => {
  it('self-reported analysis is tagged with its source', () => {
    const res = SelfReportedProvider.analyzeJournal('feeling good and motivated today');
    expect(res.source).toBe('self_report');
    expect(typeof res.sentiment).toBe('number');
  });

  it('empty/insufficient check-in history yields a neutral score object', () => {
    const res = SelfReportedProvider.scoreCheckIns([]);
    expect(res).toHaveProperty('wScore');
  });

  it('wearable provider is disabled and throws instead of inventing data', () => {
    expect(WearableProvider.enabled).toBe(false);
    expect(() => WearableProvider.read()).toThrow(/not enabled/);
  });
});
