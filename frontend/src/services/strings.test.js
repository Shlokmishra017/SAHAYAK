/**
 * Phase 6 (7.3): vernacular string architecture — every language ships the
 * same keys so the UI can never render undefined.
 */
import { describe, it, expect } from 'vitest';
import { PERSONNEL_STRINGS } from './strings.js';

describe('personnel strings', () => {
  it('hindi covers every english key (shallow + channels)', () => {
    const en = PERSONNEL_STRINGS.en;
    const hi = PERSONNEL_STRINGS.hi;
    for (const key of Object.keys(en)) {
      expect(hi[key], `missing hi key: ${key}`).toBeDefined();
    }
    for (const key of Object.keys(en.channels)) {
      expect(hi.channels[key], `missing hi channel: ${key}`).toBeDefined();
    }
  });

  it('no technical jargon leaks into personnel strings', () => {
    const blob = JSON.stringify(PERSONNEL_STRINGS).toLowerCase();
    for (const banned of ['z0', 'z1', 'ewma', 'shap', 'int8', 'biometric', 'uuid', 'hash']) {
      expect(blob).not.toContain(banned);
    }
  });
});
