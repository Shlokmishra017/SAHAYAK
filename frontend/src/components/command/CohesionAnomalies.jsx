import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

export function CohesionAnomalies() {
  const anomalies = [
    {
      sub_unit_name: "CRPF 144 Bn - Alpha Coy (CI Ops)",
      parent_unit: "CRPF 144 Bn",
      total_personnel: 120,
      leave_denial_rate: 0.38,
      duty_variance: 28.4,
      climate_friction_score: 0.82,
      anomaly_indicators: [
        "Unusual Leave Denial Concentration (>38%)",
        "Disproportionate Night Shift Rotation Clustering",
        "Elevated Grievance Rate"
      ],
      recommended_command_action: "Conduct Company Commander climate debrief and equalize shift rosters."
    },
    {
      sub_unit_name: "RAF 108 Bn - Delta Platoon (Riot Standby)",
      parent_unit: "RAF 108 Bn",
      total_personnel: 65,
      leave_denial_rate: 0.29,
      duty_variance: 31.2,
      climate_friction_score: 0.68,
      anomaly_indicators: [
        "Sudden Night Call-out Variance Spikes",
        "Low Rest Recovery Ratio"
      ],
      recommended_command_action: "Provide 48-hour decompression stand-down following public order deployment."
    }
  ];

  return (
    <div className="space-y-4 text-xs">
      {/* Intro notice */}
      <div className="p-3.5 bg-[#111A2B] border border-[#1E2D4A] rounded-xl flex items-center gap-3 text-slate-300">
        <Activity className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <strong className="block text-white font-medium">Cohort-Level Isolation Forest Anomaly Detection:</strong>
          <span className="text-slate-400">Surfaces command climate friction and structural fatigue without profiling individual soldiers.</span>
        </div>
      </div>

      <div className="space-y-3">
        {anomalies.map((item, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {item.sub_unit_name}
                </h4>
                <p className="text-[11px] text-slate-400">{item.parent_unit} • Cohort Size n = {item.total_personnel}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">Friction Score</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {item.climate_friction_score} <span className="text-[10px] text-slate-500 font-normal">/ 1.0</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 bg-[#0B1220] rounded-lg border border-[#1E2D4A]">
                <span className="text-slate-400 block text-[10px] font-sans">Leave Denial Rate:</span>
                <span className="text-slate-200 font-bold">{Math.round(item.leave_denial_rate * 100)}%</span>
              </div>
              <div className="p-2.5 bg-[#0B1220] rounded-lg border border-[#1E2D4A]">
                <span className="text-slate-400 block text-[10px] font-sans">Shift Variance:</span>
                <span className="text-slate-200 font-bold">{item.duty_variance} hrs</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-300 block mb-1">Detected Cohort Indicators:</span>
              <div className="space-y-1">
                {item.anomaly_indicators.map((ind, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-[#0B1220] rounded-lg border border-[#1E2D4A] text-[11px] text-slate-300">
              <strong className="text-amber-400 block mb-0.5">Command Level Action:</strong>
              {item.recommended_command_action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
