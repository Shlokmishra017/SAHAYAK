import React, { useState } from 'react';
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export function RotationAdvisor() {
  const { showToast } = useAppState();
  const [plans, setPlans] = useState([
    {
      id: 'ROT-01',
      unit_from: 'CRPF 144 Bn - Alpha Coy (82 Days Continuous CI Duty)',
      unit_to: 'CRPF 144 Bn - Bravo Coy (Rear Base Decompression)',
      rationale: 'Alpha Coy has crossed 75-day continuous threshold. Scheduled 14-day stand-down rotation.',
      status: 'pending'
    },
    {
      id: 'ROT-02',
      unit_from: 'BSF 92 Bn - Charlie Coy (High Altitude Outpost)',
      unit_to: 'BSF 92 Bn - Sector HQ Reserve',
      rationale: 'Seasonal rotation cycle for weather-induced fatigue mitigation.',
      status: 'approved'
    }
  ]);

  const handleApprove = (id) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
    showToast("Rotation plan confirmed & roster directives generated.", "success");
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3.5 bg-[#111A2B] border border-[#1E2D4A] rounded-xl flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
          <span><strong>Predictive Operational Rotation:</strong> Balances rest cycles before fatigue escalates to critical levels.</span>
        </div>
      </div>

      <div className="space-y-3">
        {plans.map(plan => (
          <div key={plan.id} className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-400">{plan.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                plan.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {plan.status}
              </span>
            </div>

            <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-200 font-medium">
                <span className="text-rose-300">{plan.unit_from}</span>
                <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block" />
                <span className="text-emerald-300">{plan.unit_to}</span>
              </div>
              <p className="text-[11px] text-slate-400 italic leading-relaxed">"{plan.rationale}"</p>
            </div>

            <div className="flex justify-end">
              {plan.status === 'pending' ? (
                <button
                  onClick={() => handleApprove(plan.id)}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Rotation Directive</span>
                </button>
              ) : (
                <span className="text-emerald-400 font-medium flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Directive Dispatched to Adjutant</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
