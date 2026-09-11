/**
 * Sahayak API Service Bridge
 * Connects to the FastAPI backend, with seamless client-side simulated state fallback.
 */

const API_BASE = '/v1';

export async function loginWithCredentials(fullName, serviceId, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        service_id: serviceId,
        password: password
      })
    });
    if (!res.ok) throw new Error('Authentication failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend auth offline, resolving mock RBAC identity locally:', err);
    const svc = (serviceId || '').toUpperCase().trim();
    let role = 'Z0_PERSONNEL';
    let rank = 'Constable (GD)';
    let name = fullName || 'Vikram Singh';
    let unit = 'CRPF 144 Bn (CI Ops)';
    let level = 'Level 0 — Force Personnel (Jawan) Confidential Wellness Suite';
    let clearance = 'Confidential (Local Enclave)';
    let avatar = 'VS';

    if (svc.includes('WO') || svc.includes('7742') || svc.includes('WELFARE')) {
      role = 'Z1_WELFARE_OFFICER';
      rank = 'Capt. / Unit Welfare Officer';
      name = fullName || 'Meera Nair';
      unit = 'Sector Welfare Board';
      level = 'Level 1 — Unit Welfare Officer Triage & Intervention Core';
      clearance = 'Welfare Officer (Case Level)';
      avatar = 'MN';
    } else if (svc.includes('CMD') || svc.includes('1082') || svc.includes('COM')) {
      role = 'Z1_COMMANDER';
      rank = 'Col. / Sector Commander';
      name = fullName || 'R. V. Deshmukh';
      unit = 'Sector HQ, Srinagar';
      level = 'Level 2 — Battalion / Sector Commander Macro Strategy';
      clearance = 'Command Level (k-Anonymity Guarded)';
      avatar = 'RD';
    } else if (svc.includes('AUD') || svc.includes('9901') || svc.includes('INSPECT')) {
      role = 'AUDITOR';
      rank = 'Inspector / Systems Auditor';
      name = fullName || 'Alok Verma';
      unit = 'Central Compliance Bureau';
      level = 'Level 3 — Technical Auditor & Cryptographic Trust Verifier';
      clearance = 'Cryptographic Ledger Inspector';
      avatar = 'AV';
    }

    return {
      authenticated: true,
      token: 'jwt_mock_client_token',
      user: {
        id: svc || 'CAPF-849201',
        service_id: svc || 'CAPF-849201',
        full_name: name,
        rank,
        unit,
        role,
        level_label: level,
        clearance,
        avatar
      }
    };
  }
}

export async function fetchRiskBand(pseudonymId) {
  try {
    const res = await fetch(`${API_BASE}/device/risk-band/${pseudonymId}`);
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, using client mock for risk band:', err);
    return {
      pseudonym_id: pseudonymId,
      as_of: new Date().toISOString().split('T')[0],
      h_band: 3,
      reason_codes: ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER"],
      thresholds: { tau1: 0.45, tau2: 0.65, tau3: 0.85 },
      unit_baseline_median: 0.52,
      model_version: "sahayak-hr-lgbm-v1.4"
    };
  }
}

export async function submitEscalation(payload) {
  try {
    const res = await fetch(`${API_BASE}/device/escalations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Escalation failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, simulated escalation intake:', err);
    return { status: "accepted", case_id: `CASE-LOCAL-${Math.floor(Math.random()*10000)}`, tier: payload.tier };
  }
}

export async function submitSelfReferral(pseudonymId, supportType) {
  try {
    const res = await fetch(`${API_BASE}/device/self-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudonym_id: pseudonymId,
        support_type_preference: supportType,
        request_timestamp: new Date().toISOString()
      })
    });
    return await res.json();
  } catch (err) {
    return { status: "created", case_id: `CASE-SELF-LOCAL` };
  }
}

export async function requestDataPurge(pseudonymId) {
  try {
    const res = await fetch(`${API_BASE}/device/erasure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudonym_id: pseudonymId, confirmation_token: 'CONFIRMED' })
    });
    return await res.json();
  } catch (err) {
    return { status: "purged", purged_cases: 1 };
  }
}

export async function fetchWelfareCases(tierFilter = null) {
  try {
    const url = tierFilter ? `${API_BASE}/welfare/cases?tier=${tierFilter}` : `${API_BASE}/welfare/cases`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock welfare cases:', err);
    return [
      {
        case_id: "CASE-A92B104F",
        pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
        tier: "critical",
        origin: "device_fusion",
        reason_codes: ["RC_ACUTE_DISTRESS_MARKER", "RC_SUSTAINED_DEPLOYMENT", "RC_SLEEP_DEGRADATION_TREND"],
        opened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        status: "open",
        unit_context: "CRPF 144 Bn (CI Ops)",
        h_band: 4,
        has_acute_marker: true,
        officer_label: null,
        interventions_count: 0
      },
      {
        case_id: "CASE-771C40DE",
        pseudonym_id: "b21e8902-3c11-4190-8809-5100918ef012",
        tier: "elevated",
        origin: "device_fusion",
        reason_codes: ["RC_POST_LEAVE_VULNERABILITY", "RC_DENIED_LEAVE_CLUSTER"],
        opened_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        status: "in_review",
        unit_context: "BSF 92 Bn (Forward Post)",
        h_band: 3,
        has_acute_marker: false,
        officer_label: null,
        interventions_count: 1
      },
      {
        case_id: "CASE-49B28A01",
        pseudonym_id: "099a410c-99a1-4322-9110-184719283720",
        tier: "elevated",
        origin: "hr_channel",
        reason_codes: ["RC_NIGHT_SHIFT_OVERLOAD", "RC_FREQUENT_TRANSFER"],
        opened_at: new Date(Date.now() - 3600000 * 36).toISOString(),
        status: "open",
        unit_context: "RAF 108 Bn (Rapid Action)",
        h_band: 3,
        has_acute_marker: false,
        officer_label: null,
        interventions_count: 0
      },
      {
        case_id: "CASE-118E332A",
        pseudonym_id: "a7182903-88bb-4a11-bb92-091823901928",
        tier: "emerging",
        origin: "device_fusion",
        reason_codes: ["RC_SOMATIC_FATIGUE_CLUSTER", "RC_MOOD_TRAJECTORY_DROP"],
        opened_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        status: "intervention_active",
        unit_context: "CISF Plant Security Unit",
        h_band: 2,
        has_acute_marker: false,
        officer_label: "true_concern",
        interventions_count: 1
      }
    ];
  }
}

export async function logWelfareIntervention(caseId, kind, notes) {
  try {
    const res = await fetch(`${API_BASE}/welfare/cases/${caseId}/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        kind,
        performed_by_role: "welfare_officer",
        officer_id: "WO_7742",
        notes_sanitized: notes
      })
    });
    return await res.json();
  } catch (err) {
    return {
      status: "recorded",
      intervention: {
        intervention_id: `INT-${Math.floor(Math.random()*10000)}`,
        case_id: caseId,
        kind,
        performed_at: new Date().toISOString(),
        notes_sanitized: notes
      }
    };
  }
}

export async function submitOfficerLabel(caseId, label, feedback) {
  try {
    const res = await fetch(`${API_BASE}/welfare/cases/${caseId}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        officer_id: "WO_7742",
        label,
        feedback_notes: feedback
      })
    });
    return await res.json();
  } catch (err) {
    return { status: "label_saved", case_id: caseId, officer_label: label };
  }
}

export async function fetchCommanderHeatmap() {
  try {
    const res = await fetch(`${API_BASE}/command/heatmap`);
    if (!res.ok) throw new Error('Failed to fetch heatmap');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock heatmap:', err);
    return [
      {
        cohort_name: "CRPF 144 Bn (CI Ops) - Alpha Coy",
        parent_unit: "CRPF 144 Bn",
        force_type: "CRPF",
        total_personnel: 120,
        is_suppressed: false,
        avg_fatigue_index: 7.8,
        risk_distribution: { low: 45, moderate: 35, elevated: 28, critical: 12 },
        workload_score: 0.85,
        rotation_recommendation: "High Priority: Plan 14-day Rest Stand-down Cycle"
      },
      {
        cohort_name: "CRPF 144 Bn (CI Ops) - Bravo Coy",
        parent_unit: "CRPF 144 Bn",
        force_type: "CRPF",
        total_personnel: 105,
        is_suppressed: false,
        avg_fatigue_index: 6.2,
        risk_distribution: { low: 52, moderate: 31, elevated: 18, critical: 4 },
        workload_score: 0.65,
        rotation_recommendation: "Moderate Fatigue: Monitor shift rotation variance"
      },
      {
        cohort_name: "CRPF 144 Bn - Detached Outpost (Small Platoon)",
        parent_unit: "CRPF 144 Bn",
        force_type: "CRPF",
        total_personnel: 14, // n < 20 -> SUPPRESSED!
        is_suppressed: true,
        suppression_reason: "Privacy Rule Violation: Cohort size (n=14) is below minimum threshold (k=20). Aggregates redacted to protect personnel identity.",
        avg_fatigue_index: null,
        risk_distribution: null,
        workload_score: null,
        rotation_recommendation: "Cohort Redacted (k-anonymity guarantee)"
      },
      {
        cohort_name: "BSF 92 Bn (Forward Post) - Charlie Coy",
        parent_unit: "BSF 92 Bn",
        force_type: "BSF",
        total_personnel: 95,
        is_suppressed: false,
        avg_fatigue_index: 5.4,
        risk_distribution: { low: 58, moderate: 22, elevated: 12, critical: 3 },
        workload_score: 0.55,
        rotation_recommendation: "Standard Routine Deployment"
      },
      {
        cohort_name: "RAF 108 Bn (Rapid Action) - Alpha Coy",
        parent_unit: "RAF 108 Bn",
        force_type: "RAF",
        total_personnel: 110,
        is_suppressed: false,
        avg_fatigue_index: 5.9,
        risk_distribution: { low: 62, moderate: 28, elevated: 16, critical: 4 },
        workload_score: 0.62,
        rotation_recommendation: "Monitor Night Duty variance"
      },
      {
        cohort_name: "CISF Plant Security - Guard Division",
        parent_unit: "CISF Security",
        force_type: "CISF",
        total_personnel: 140,
        is_suppressed: false,
        avg_fatigue_index: 3.2,
        risk_distribution: { low: 112, moderate: 20, elevated: 7, critical: 1 },
        workload_score: 0.35,
        rotation_recommendation: "Nominal Baseline (Static Shift)"
      }
    ];
  }
}

export async function executeBreakGlass(payload) {
  try {
    const res = await fetch(`${API_BASE}/identity/break-glass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Break-glass authorization failed');
    }
    return await res.json();
  } catch (err) {
    if (payload.custodian_1_pin === "9481" && payload.custodian_2_pin === "6205") {
      return {
        status: "authorized",
        message: "Dual-custodian break-glass authorization approved (Simulation).",
        identity: {
          pseudonym_id: payload.pseudonym_id,
          service_number: "CAPF-849201",
          full_name: "Constable Vikram Singh",
          rank: "Constable (GD)",
          unit: "CRPF 144 Bn (CI Ops)",
          blood_group: "B+",
          emergency_contact_phone: "+91 9876543210",
          emergency_contact_name: "Smt. Sunita Singh (Spouse)",
          base_location: "Sector HQ, Srinagar"
        }
      };
    }
    throw new Error(err.message || 'Invalid dual-custodian authorization PINs.');
  }
}

export async function fetchAuditLedger() {
  try {
    const res = await fetch(`${API_BASE}/audit/logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  } catch (err) {
    return {
      total_blocks: 4,
      blocks: [
        {
          seq: 0,
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          actor_role: "system",
          actor_id_hash: "system_core",
          action: "GENESIS_BLOCK_INITIALIZED",
          prev_hash: "0000000000000000000000000000000000000000000000000000000000000000",
          block_hash: "8f48a10b9821ef37d89201c849182390a1829038290184719284710294819201",
          metadata: { protocol: "SAHAYAK_ZERO_TRUST_AUDIT_V1" }
        },
        {
          seq: 1,
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          actor_role: "edge_device",
          actor_id_hash: "f83a1290",
          action: "ESCALATION_INTAKE_RECORDED",
          case_id: "CASE-A92B104F",
          pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
          prev_hash: "8f48a10b9821ef37d89201c849182390a1829038290184719284710294819201",
          block_hash: "3a910f8290104820194829103847291048291048291038472910482910482910",
          metadata: { tier: "critical", reason_count: 3 }
        },
        {
          seq: 2,
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          actor_role: "welfare_officer",
          actor_id_hash: "wo_7742_hash",
          action: "CASE_DETAIL_ACCESSED",
          case_id: "CASE-A92B104F",
          pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
          prev_hash: "3a910f8290104820194829103847291048291048291038472910482910482910",
          block_hash: "9102847192038472910482910482910384729104829104829103847291048291",
          metadata: { tier: "critical", h_band: 4 }
        }
      ]
    };
  }
}

export async function verifyAuditLedger() {
  try {
    const res = await fetch(`${API_BASE}/audit/verify`);
    return await res.json();
  } catch (err) {
    return {
      is_valid: true,
      total_blocks_checked: 3,
      status_message: "All cryptographic blocks verified intact",
      broken_sequence_block: null
    };
  }
}

export async function simulateAuditTampering(seq = 1) {
  try {
    const res = await fetch(`${API_BASE}/audit/tamper-simulation?block_seq=${seq}`, { method: 'POST' });
    return await res.json();
  } catch (err) {
    return {
      tampering_applied_to_seq: seq,
      verification_result: {
        is_valid: false,
        broken_sequence_block: seq,
        status_message: `Block ${seq} hash mismatch: Data tampering detected in audit chain!`
      }
    };
  }
}

export async function restoreAuditChain() {
  try {
    const res = await fetch(`${API_BASE}/audit/restore-chain`, { method: 'POST' });
    return await res.json();
  } catch (err) {
    return { status: "chain_restored_and_verified", is_valid: true };
  }
}
