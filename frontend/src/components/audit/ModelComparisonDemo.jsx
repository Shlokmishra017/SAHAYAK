import React, { useState } from 'react';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export function ModelComparisonDemo() {
  const [activeUnitType, setActiveUnitType] = useState('ci_ops');

  const unitProfiles = {
    ci_ops: {
      name: "CRPF 144 Bn (Counter-Insurgency Combat)",
      context: "Active Counter-Insurgency Operations",
      baseline_stress: 0.62,
      description: "High ambient combat hazard, continuous alert posture. A single national absolute cutoff flags 78% of the battalion as false alarms.",
      absolute_flagged_pct: 78,
      relative_flagged_pct: 12,
      relative_precision: "Calibrated to battalion operational baseline",
      absolute_result: "Alert Fatigue (Welfare board overwhelmed with false positives)"
    },
    border: {
      name: "BSF 92 Bn (Forward Border Outpost)",
      context: "Forward Line of Control",
      baseline_stress: 0.54,
      description: "Severe geographical isolation, harsh terrain, prolonged deployment spells.",
      absolute_flagged_pct: 55,
      relative_flagged_pct: 10,
      relative_precision: "Calibrated to outpost isolation factor",
      absolute_result: "Over-flagging nominal operational stress"
    },
    static: {
      name: "CISF Industrial Security Unit",
      context: "Peace Station Plant Security",
      baseline_stress: 0.32,
      description: "Low physical threat, routine 8-hour shifts. Under an absolute cutoff, genuine acute distress in a quiet unit is missed entirely.",
      absolute_flagged_pct: 2,
      relative_flagged_pct: 9,
      relative_precision: "Sensitive to subtle personal deviations from low baseline",
      absolute_result: "False Negative Risk: Misses acute personal crises"
    }
  };

  const current = unitProfiles[activeUnitType];

  return (
    <div className="space-y-4 text-xs">
      
      {/* Overview Card */}
      <div className="p-4 bg-[#111A2B] border border-[#1E2D4A] rounded-xl space-y-1.5">
        <div className="flex items-center gap-2 text-white font-semibold text-xs">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Unit-Relative vs. Absolute Risk Thresholding Benchmark</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Comparing high-intensity combat battalions and peace stations on a single absolute threshold produces heavy false positives in forward units and dangerous false negatives in quiet units.
        </p>
      </div>

      {/* Unit Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'ci_ops', label: 'Counter-Insurgency Ops' },
          { id: 'border', label: 'Border Guarding' },
          { id: 'static', label: 'Static Security' }
        ].map(u => (
          <button
            key={u.id}
            onClick={() => setActiveUnitType(u.id)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              activeUnitType === u.id
                ? 'bg-[#162238] border-amber-500/50 text-amber-300 font-semibold'
                : 'bg-[#111A2B] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      {/* Side-by-Side Comparison */}
      <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-white text-sm">{current.name}</h4>
            <p className="text-[11px] text-slate-400">{current.context}</p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#0B1220] border border-[#1E2D4A] text-slate-300 font-mono text-xs font-semibold">
            Baseline: {current.baseline_stress}
          </span>
        </div>

        <p className="text-slate-300 text-xs italic">"{current.description}"</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          
          {/* Absolute Threshold Card */}
          <div className="p-4 bg-[#0B1220] border border-rose-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-medium text-xs">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Naive Absolute Cutoff (Fixed Threshold = 0.50)</span>
            </div>
            <div className="font-mono text-lg font-bold text-rose-400">
              {current.absolute_flagged_pct}% Flagged
            </div>
            <div className="text-[11px] text-slate-300">
              <strong>Outcome: </strong>{current.absolute_result}
            </div>
          </div>

          {/* Sahayak Unit-Relative Approach */}
          <div className="p-4 bg-[#0B1220] border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-300 font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>SAHAYAK Unit-Relative Calibration (Robust Median/MAD)</span>
            </div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {current.relative_flagged_pct}% Flagged
            </div>
            <div className="text-[11px] text-slate-300">
              <strong>Outcome: </strong>{current.relative_precision}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
