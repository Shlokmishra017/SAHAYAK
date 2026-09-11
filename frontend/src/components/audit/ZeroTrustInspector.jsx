import React, { useState } from 'react';
import { FileCode, CheckCircle2 } from 'lucide-react';

export function ZeroTrustInspector() {
  const [selectedChannel, setSelectedChannel] = useState('escalation');

  const channelContracts = {
    escalation: {
      title: "Z0 Device ➔ Z1 Welfare Gateway (Escalation Egress)",
      description: "Transmitted only when local fusion exceeds threshold. Raw text, audio, and continuous mood scores are 100% absent.",
      samplePayload: {
        pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
        tier: "elevated",
        reason_codes: [
          "RC_SUSTAINED_DEPLOYMENT",
          "RC_SLEEP_DEGRADATION_TREND"
        ],
        detected_at: "2026-09-11T09:41:00Z",
        model_version: "sahayak-edge-v1.2",
        "RAW_TEXT_INSPECT": "NULL (Blocked by Z0 Client Guard)",
        "RAW_AUDIO_INSPECT": "NULL (Blocked by Z0 Client Guard)",
        "CONTINUOUS_MOOD_INSPECT": "NULL (Computed locally)"
      },
      invariantVerification: "Verified: Strict closed-vocabulary reason codes only."
    },
    risk_pull: {
      title: "Z1 Risk API ➔ Z0 Device (Inverted Risk Band Pull)",
      description: "The client device pulls unit-relative operational parameters to perform local fusion on-device.",
      samplePayload: {
        pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
        as_of: "2026-09-11",
        h_band: 3,
        reason_codes: ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER"],
        thresholds: { tau1: 0.45, tau2: 0.65, tau3: 0.85 },
        unit_baseline_median: 0.52,
        model_version: "sahayak-hr-lgbm-v1.4"
      },
      invariantVerification: "Verified: Device receives coarse band (0-4) and unit baseline."
    },
    break_glass: {
      title: "Z1 Welfare Core ➔ Z2 Identity Broker (Dual Break-Glass)",
      description: "Re-identification payload requires two co-signed digital cryptographic pins.",
      samplePayload: {
        case_id: "CASE-A92B104F",
        pseudonym_id: "f83a1290-7d1a-4c22-98ab-3011982bca81",
        custodian_1: { role: "welfare_officer", id: "WO_7742", sig_status: "VERIFIED" },
        custodian_2: { role: "medical_officer", id: "MO_3109", sig_status: "VERIFIED" },
        justification: "Life-safety critical hospital escort required.",
        audit_hash_chain: "APPENDED_SHA256"
      },
      invariantVerification: "Verified: No single administrator can execute de-anonymization."
    }
  };

  const current = channelContracts[selectedChannel];

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'escalation', label: '1. Escalation Packet (Z0 ➔ Z1)' },
          { id: 'risk_pull', label: '2. Risk Band Sync (Z1 ➔ Z0)' },
          { id: 'break_glass', label: '3. Dual Break-Glass (Z1 ➔ Z2)' }
        ].map(ch => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch.id)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              selectedChannel === ch.id
                ? 'bg-[#162238] border-amber-500/50 text-amber-300 font-semibold'
                : 'bg-[#111A2B] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-3">
        <div>
          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>{current.title}</span>
          </h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{current.description}</p>
        </div>

        <div className="p-4 bg-[#0B1220] rounded-xl border border-[#1E2D4A] font-mono text-[11px] overflow-x-auto text-emerald-300">
          <pre>{JSON.stringify(current.samplePayload, null, 2)}</pre>
        </div>

        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 font-medium text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{current.invariantVerification}</span>
        </div>
      </div>
    </div>
  );
}
