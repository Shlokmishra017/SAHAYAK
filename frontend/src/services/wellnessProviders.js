/**
 * Wellness provider abstraction (Phase 3, plan 4.3).
 *
 * Current prototype uses voluntary SELF-REPORTED wellness indicators only
 * (mood slider, sleep hours, journal sentiment). We deliberately do not
 * fabricate wearable measurements.
 *
 *   WellnessProvider
 *    ├── SelfReportedProvider  (implemented, source: 'self_report')
 *    └── WearableProvider      (future / not enabled — see below)
 *
 * Future wearable records, when a consented device integration exists, must
 * carry: { source, timestamp, sleep_duration, resting_hr, hrv,
 * activity_level, device_confidence, consent }. Until then, WearableProvider
 * is a documented stub that throws instead of inventing data.
 */
import {
  analyzeJournalTextLocally,
  computeLocalWellnessScore,
  performLocalFusion
} from './localModel';

export const SelfReportedProvider = {
  source: 'self_report',
  analyzeJournal: (text) => ({ ...analyzeJournalTextLocally(text), source: 'self_report' }),
  scoreCheckIns: (history) => ({ ...computeLocalWellnessScore(history), source: 'self_report' }),
  fuse: (wScore, hBand, thresholds, hasAcute) =>
    performLocalFusion(wScore, hBand, thresholds, hasAcute)
};

export const WearableProvider = {
  source: 'wearable',
  enabled: false,
  read() {
    throw new Error(
      'Wearable integration is not enabled in this prototype. ' +
      'No wearable measurements are fabricated; connect a consented device adapter first.'
    );
  }
};

export const WellnessProviders = {
  self_report: SelfReportedProvider,
  wearable: WearableProvider
};
