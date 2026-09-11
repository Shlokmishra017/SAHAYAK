import React, { useState } from 'react';
import { EyeOff, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

export function KAnonDemo() {
  const [testCohortSize, setTestCohortSize] = useState(14);
  const [enableComplementarySuppression, setEnableComplementarySuppression] = useState(true);

  const kThreshold = 20;
  const isSuppressed = testCohortSize < kThreshold;

  return (
    <div className="space-y-5 text-xs">
      
      {/* Interactive Explanation */}
      <div className="p-4 bg-[#111A2B] border border-[#1E2D4A] rounded-xl space-y-1.5">
        <div className="flex items-center gap-2 text-white font-semibold text-xs">
          <EyeOff className="w-4 h-4 text-amber-400" />
          <span>k-Anonymity & Differencing Attack Prevention</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          In commander views, observing statistics for small outposts (n &lt; 20) risks individual re-identification. SAHAYAK enforces strict cell suppression for cohorts where n &lt; 20.
        </p>
      </div>

      {/* Interactive Slider */}
      <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-xs flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Simulate Cohort Size (n)</span>
          </span>
          <span className={`font-mono text-sm font-bold ${isSuppressed ? 'text-rose-400' : 'text-emerald-400'}`}>
            n = {testCohortSize} personnel
          </span>
        </div>

        <input
          type="range"
          min="5"
          max="60"
          value={testCohortSize}
          onChange={(e) => setTestCohortSize(parseInt(e.target.value))}
          className="w-full accent-amber-500 bg-[#0B1220] h-2 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>n = 5 (Outpost)</span>
          <span className="text-amber-400">k = 20 Barrier</span>
          <span>n = 60 (Company)</span>
        </div>

        {/* Live Privacy Engine Decision Box */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isSuppressed 
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 space-y-1.5' 
            : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 space-y-1.5'
        }`}>
          <div className="flex items-center gap-2 font-semibold text-xs">
            {isSuppressed ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Privacy Rule Enforced: Aggregate Redacted (n = {testCohortSize} &lt; {kThreshold})</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Privacy Rule Satisfied: Aggregate Display Approved (n = {testCohortSize} &ge; {kThreshold})</span>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isSuppressed 
              ? 'To prevent individual surveillance, the system redacts fatigue averages, sleep distributions, and risk breakdowns.'
              : 'Statistical aggregates are safely anonymized across this group size without identifying individual personnel.'}
          </p>
        </div>

        {/* Complementary Suppression Feature */}
        <div className="p-3.5 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs">Complementary Cell Suppression:</span>
            <input
              type="checkbox"
              checked={enableComplementarySuppression}
              onChange={(e) => setEnableComplementarySuppression(e.target.checked)}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Prevents algebraic deduction by suppressing a companion cell whenever a subgroup is redacted.
          </p>
        </div>
      </div>

    </div>
  );
}
