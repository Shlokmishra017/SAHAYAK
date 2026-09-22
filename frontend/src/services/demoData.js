/**
 * Explicit demo dataset — ONLY used when VITE_DEMO_MODE=true.
 * Every consumer must surface the DEMO DATA banner (see DemoModeBanner).
 * Normal mode (default) never touches this file.
 */

export function markDemo(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({ ...item, __demo: true }));
  }
  if (payload && typeof payload === 'object') {
    return { ...payload, __demo: true };
  }
  return payload;
}

export const DEMO_RISK_BAND = (pseudonymId) => ({
  pseudonym_id: pseudonymId,
  as_of: new Date().toISOString().split('T')[0],
  h_band: 3,
  reason_codes: ['RC_SUSTAINED_DEPLOYMENT', 'RC_DENIED_LEAVE_CLUSTER'],
  thresholds: { tau1: 0.45, tau2: 0.65, tau3: 0.85 },
  unit_baseline_median: 0.52,
  model_version: 'sahayak-hr-gbr-v2.0-synthetic',
  confidence: 'standard',
  confidence_note: null,
  trend: 'insufficient_history'
});

export const DEMO_CASES = () => [
  {
    case_id: 'CASE-A92B104F',
    pseudonym_id: 'f83a1290-7d1a-4c22-98ab-3011982bca81',
    tier: 'critical',
    origin: 'device_fusion',
    reason_codes: ['RC_ACUTE_DISTRESS_MARKER', 'RC_SUSTAINED_DEPLOYMENT', 'RC_SLEEP_DEGRADATION_TREND'],
    opened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'open',
    unit_context: 'CRPF 144 Bn (CI Ops)',
    h_band: 4,
    has_acute_marker: true,
    officer_label: null,
    interventions_count: 0
  },
  {
    case_id: 'CASE-771C40DE',
    pseudonym_id: 'b21e8902-3c11-4190-8809-5100918ef012',
    tier: 'elevated',
    origin: 'device_fusion',
    reason_codes: ['RC_POST_LEAVE_VULNERABILITY', 'RC_DENIED_LEAVE_CLUSTER'],
    opened_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: 'in_review',
    unit_context: 'BSF 92 Bn (Forward Post)',
    h_band: 3,
    has_acute_marker: false,
    officer_label: null,
    interventions_count: 1
  },
  {
    case_id: 'CASE-49B28A01',
    pseudonym_id: '099a410c-99a1-4322-9110-184719283720',
    tier: 'elevated',
    origin: 'hr_channel',
    reason_codes: ['RC_NIGHT_SHIFT_OVERLOAD', 'RC_FREQUENT_TRANSFER'],
    opened_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    status: 'open',
    unit_context: 'RAF 108 Bn (Rapid Action)',
    h_band: 3,
    has_acute_marker: false,
    officer_label: null,
    interventions_count: 0
  },
  {
    case_id: 'CASE-118E332A',
    pseudonym_id: 'a7182903-88bb-4a11-bb92-091823901928',
    tier: 'emerging',
    origin: 'device_fusion',
    reason_codes: ['RC_SOMATIC_FATIGUE_CLUSTER', 'RC_MOOD_TRAJECTORY_DROP'],
    opened_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'intervention_active',
    unit_context: 'CISF Plant Security Unit',
    h_band: 2,
    has_acute_marker: false,
    officer_label: 'true_concern',
    interventions_count: 1
  }
];

export const DEMO_HEATMAP = () => [
  {
    cohort_name: 'CRPF 144 Bn (CI Ops) - Alpha Coy',
    parent_unit: 'CRPF 144 Bn',
    force_type: 'CRPF',
    total_personnel: 120,
    is_suppressed: false,
    avg_fatigue_index: 7.8,
    risk_distribution: { low: 45, moderate: 35, elevated: 28, critical: 12 },
    workload_score: 0.85,
    rotation_recommendation: 'High Priority: Plan 14-day Rest Stand-down Cycle'
  },
  {
    cohort_name: 'CRPF 144 Bn - Detached Outpost (Small Platoon)',
    parent_unit: 'CRPF 144 Bn',
    force_type: 'CRPF',
    total_personnel: 14,
    is_suppressed: true,
    suppression_reason: 'Privacy Rule Violation: Cohort size (n=14) is below minimum threshold (k=20). Aggregates redacted to protect personnel identity.',
    avg_fatigue_index: null,
    risk_distribution: null,
    workload_score: null,
    rotation_recommendation: 'Cohort Redacted (k-anonymity guarantee)'
  }
];

export const DEMO_CUSTODIANS = () => ({
  authorized_custodians: [
    { id: 'WO_7742', role: 'welfare_officer', name: 'Unit Welfare Officer' },
    { id: 'MO_3109', role: 'medical_officer', name: 'Regimental Medical Officer' },
    { id: 'ADJ_102', role: 'adjutant', name: 'Unit Adjutant' }
  ]
});
