/**
 * Sahayak API client — Phase 1 trust model.
 *
 * Normal mode (default, VITE_DEMO_MODE=false):
 *   API request → success → real response
 *   API request → failure → visible error (thrown, never fabricated)
 *
 * Demo mode (explicit opt-in, VITE_DEMO_MODE=true):
 *   backend failure → clearly marked simulated data ({ __demo: true })
 *   UI must render the DEMO DATA banner (see DemoModeBanner).
 *
 * Demo mode is never silently activated.
 */
import { markDemo, DEMO_RISK_BAND, DEMO_CASES, DEMO_HEATMAP, DEMO_CUSTODIANS } from './demoData';

const API_BASE = '/v1';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export function isDemoMode() {
  return DEMO_MODE;
}

if (DEMO_MODE) {
  console.warn(
    '[Sahayak] VITE_DEMO_MODE=true — simulated demo data may be shown. ' +
    'Clearly marked with DEMO DATA banner. Never use for operational decisions.'
  );
}

function authHeaders(extra = {}) {
  const token = window.localStorage.getItem('sahayak_access_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  if (response.status === 401) {
    window.localStorage.removeItem('sahayak_access_token');
  }

  return response;
}

/** Throw a user-facing backend-unavailable error (normal mode). */
function backendUnavailable(context) {
  const error = new Error(`Backend unavailable — ${context} was not submitted. Please reconnect and retry.`);
  error.code = 'BACKEND_UNAVAILABLE';
  return error;
}

function demoOrThrow(context, demoFactory) {
  if (DEMO_MODE) {
    console.warn(`[Sahayak] Backend unavailable; serving explicit DEMO data for: ${context}`);
    return markDemo(demoFactory());
  }
  throw backendUnavailable(context);
}

export async function loginWithCredentials(fullName, serviceId, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: fullName,
      service_id: serviceId,
      password: password
    })
  }).catch(() => {
    throw backendUnavailable('Login');
  });
  if (!res.ok) {
    const error = new Error('Authentication failed. Please verify service credentials.');
    error.status = res.status;
    throw error;
  }
  const response = await res.json();
  window.localStorage.setItem('sahayak_access_token', response.access_token);
  return { ...response, token: response.access_token };
}

export async function attestDevice(fingerprint = 'a9f8b2c4d6e1f0a3', appVersion = '1.4.0', nonce = 'nonce_91823719') {
  try {
    const res = await apiFetch(`${API_BASE}/device/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_fingerprint: fingerprint,
        app_version: appVersion,
        attestation_nonce: nonce
      })
    });
    if (!res.ok) throw new Error('Attestation failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    throw backendUnavailable('Device attestation');
  }
}

export async function fetchRiskBand(pseudonymId) {
  try {
    const res = await apiFetch(`${API_BASE}/device/risk-band/${pseudonymId}`);
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('risk-band fetch', () => DEMO_RISK_BAND(pseudonymId));
  }
}

export async function submitEscalation(payload) {
  try {
    const res = await apiFetch(`${API_BASE}/device/escalations`, {
      method: 'POST',
      headers: authHeaders({
        'Content-Type': 'application/json',
        'Idempotency-Key': payload.client_event_id || crypto.randomUUID()
      }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Escalation failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('escalation submit', () => ({
      status: 'demo-simulated',
      case_id: 'DEMO-CASE-SIMULATED',
      tier: payload.tier
    }));
  }
}

export async function submitSelfReferral(pseudonymId, supportType) {
  try {
    const res = await apiFetch(`${API_BASE}/device/self-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudonym_id: pseudonymId,
        support_type_preference: supportType,
        request_timestamp: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error('Self-referral failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('support request', () => ({ status: 'demo-simulated', case_id: 'DEMO-CASE-SIMULATED' }));
  }
}

export async function requestDataPurge(pseudonymId, confirmationToken) {
  const token = confirmationToken || `CONFIRM-${pseudonymId}`;
  try {
    const res = await apiFetch(`${API_BASE}/device/erasure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudonym_id: pseudonymId, confirmation_token: token })
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || 'Erasure request failed');
    }
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    if (err?.message && !err.message.includes('Backend unavailable')) throw err;
    return demoOrThrow('erasure request', () => ({
      status: 'demo-simulated',
      purged_cases: 0,
      purged_interventions: 0
    }));
  }
}

export async function fetchWelfareCases(tierFilter = null, statusFilter = null) {
  try {
    const params = new URLSearchParams();
    if (tierFilter && tierFilter !== 'all') params.append('tier', tierFilter);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`${API_BASE}/welfare/cases${query}`);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('case-list fetch', () => DEMO_CASES());
  }
}

export async function fetchCaseDetail(caseId) {
  try {
    const res = await apiFetch(`${API_BASE}/welfare/cases/${caseId}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Welfare case not found.');
      throw new Error('Failed to fetch case detail');
    }
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    if (err?.message === 'Welfare case not found.') throw err;
    return demoOrThrow(`case-detail fetch (${caseId})`, () => {
      const demo = DEMO_CASES()[0];
      return {
        case: { ...demo, case_id: caseId, interventions: [] },
        reason_metadata: [],
        interventions: []
      };
    });
  }
}

export async function logWelfareIntervention(caseId, kind, notes, options = {}) {
  try {
    const res = await apiFetch(`${API_BASE}/welfare/cases/${caseId}/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        kind,
        performed_by_role: 'welfare_officer',
        officer_id: 'WO_7742',
        notes_sanitized: notes,
        target_concern: options.targetConcern || null,
        follow_up_date: options.followUpDate || null
      })
    });
    if (!res.ok) throw new Error('Failed to record intervention');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('intervention submit', () => ({
      status: 'demo-simulated',
      intervention: { intervention_id: 'DEMO-INT-SIMULATED', case_id: caseId, kind }
    }));
  }
}

export async function submitOfficerLabel(caseId, label, feedback) {  try {
    const res = await apiFetch(`${API_BASE}/welfare/cases/${caseId}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        officer_id: 'WO_7742',
        label,
        feedback_notes: feedback
      })
    });
    if (!res.ok) throw new Error('Failed to save label');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('label submit', () => ({ status: 'demo-simulated', case_id: caseId, officer_label: label }));
  }
}

export async function fetchCommanderHeatmap(simulatePrivacyViolation = false) {
  try {
    const url = simulatePrivacyViolation
      ? `${API_BASE}/command/heatmap?simulate_privacy_violation=true`
      : `${API_BASE}/command/heatmap`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Failed to fetch heatmap');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('heatmap fetch', () => DEMO_HEATMAP());
  }
}

export async function fetchCohesionAnomalies() {
  try {
    const res = await apiFetch(`${API_BASE}/command/cohesion-anomalies`);
    if (!res.ok) throw new Error('Failed to fetch cohesion anomalies');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('cohesion fetch', () => []);
  }
}

export async function fetchCohortStatistics() {
  try {
    const res = await apiFetch(`${API_BASE}/command/cohort-statistics`);
    if (!res.ok) throw new Error('Failed to fetch cohort statistics');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('cohort statistics fetch', () => ({
      total_personnel: 0,
      unit_name: 'Unknown (demo)',
      force_type_distribution: {}
    }));
  }
}

export async function fetchCustodiansInfo() {
  try {
    const res = await apiFetch(`${API_BASE}/identity/custodians-info`);
    if (!res.ok) throw new Error('Failed to fetch custodians info');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    // Demo fallback contains NO PINs. PINs must be entered via secure input.
    return demoOrThrow('custodian directory fetch', () => DEMO_CUSTODIANS());
  }
}

export async function executeBreakGlass(payload) {
  let res;
  try {
    res = await apiFetch(`${API_BASE}/identity/break-glass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    throw backendUnavailable('Break-glass authorization');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Break-glass authorization failed');
  }
  return await res.json();
}

export async function fetchAuditLedger(limit = 50) {
  try {
    const res = await apiFetch(`${API_BASE}/audit/logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('audit fetch', () => ({ total_blocks: 0, blocks: [] }));
  }
}

export async function verifyAuditLedger() {
  try {
    const res = await apiFetch(`${API_BASE}/audit/verify`);
    if (!res.ok) throw new Error('Verify failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('audit verify', () => ({
      is_valid: false,
      total_blocks_checked: 0,
      status_message: 'Demo mode: backend unavailable, verification simulated as inconclusive',
      broken_sequence_block: null
    }));
  }
}

export async function simulateAuditTampering(seq = 1) {
  try {
    const res = await apiFetch(`${API_BASE}/audit/tamper-simulation?block_seq=${seq}`, { method: 'POST' });
    if (!res.ok) throw new Error('Tamper simulation failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    throw backendUnavailable('Tamper simulation');
  }
}

export async function restoreAuditChain() {
  try {
    const res = await apiFetch(`${API_BASE}/audit/restore-chain`, { method: 'POST' });
    if (!res.ok) throw new Error('Restore failed');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    throw backendUnavailable('Audit restore');
  }
}

export async function recordInterventionOutcome(caseId, interventionId, outcome, outcomeScore, notes) {
  try {
    const res = await apiFetch(`${API_BASE}/welfare/cases/${caseId}/interventions/${interventionId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        outcome_score: outcomeScore ?? null,
        notes_sanitized: notes || null
      })
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || 'Failed to record outcome');
    }
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    if (err?.message && !err.message.includes('Backend unavailable')) throw err;
    return demoOrThrow('outcome submit', () => ({
      status: 'demo-simulated',
      intervention_id: interventionId,
      outcome,
      case_status: caseId
    }));
  }
}

export async function changeCaseStatus(caseId, status) {
  try {
    const res = await apiFetch(`${API_BASE}/welfare/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || 'Failed to change status');
    }
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    if (err?.message && !err.message.includes('Backend unavailable')) throw err;
    return demoOrThrow('status change', () => ({ status, case_id: caseId, previous: 'unknown' }));
  }
}

export async function fetchRecentInterventions(limit = 20) {
  try {
    const res = await apiFetch(`${API_BASE}/welfare/interventions/recent?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch interventions');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('interventions fetch', () => []);
  }
}

export async function importHrmsCsv(file) {
  const token = window.localStorage.getItem('sahayak_access_token');
  const form = new FormData();
  form.append('file', file);
  let res;
  try {
    res = await fetch(`${API_BASE}/hrms/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
  } catch {
    throw backendUnavailable('HRMS import');
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || 'HRMS import failed');
  }
  return await res.json();
}

export async function fetchHrmsTemplate() {
  try {
    const res = await apiFetch(`${API_BASE}/hrms/template`);
    if (!res.ok) throw new Error('Failed to fetch HRMS template');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('HRMS template fetch', () => ({ required_columns: [], optional_columns: [] }));
  }
}

export async function fetchAlerts(status = null) {
  try {
    const url = status ? `${API_BASE}/alerts?status=${status}` : `${API_BASE}/alerts`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('alerts fetch', () => []);
  }
}

export async function acknowledgeAlert(alertId) {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${alertId}/ack`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return await res.json();
  } catch (err) {
    if (err?.code === 'BACKEND_UNAVAILABLE') throw err;
    return demoOrThrow('alert acknowledge', () => ({ alert_id: alertId, status: 'demo-simulated' }));
  }
}
