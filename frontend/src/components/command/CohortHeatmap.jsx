import React, { useState } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  EyeOff, 
  Users, 
  Activity, 
  Layers 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { KAnonDemo } from './KAnonDemo';
import { CohesionAnomalies } from './CohesionAnomalies';
import { RotationAdvisor } from './RotationAdvisor';

export function CohortHeatmap({ externalSection }) {
  const { commanderHeatmap } = useAppState();
  const [activeSubTab, setActiveSubTab] = useState(externalSection || 'heatmap');

  const subTabs = [
    { id: 'heatmap', label: 'Unit Fatigue Overview', icon: BarChart3 },
    { id: 'kanon', label: 'k-Anonymity & Privacy Guard', icon: EyeOff },
    { id: 'cohesion', label: 'Cohort Climate Anomalies', icon: Activity },
    { id: 'rotation', label: 'Rotation Advisor', icon: Users }
  ];

  return (
    <div className="space-y-6">
      
      {/* Commander Overview Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Monitored Personnel</span>
          <div className="text-xl font-bold text-white">470</div>
          <span className="text-[11px] text-slate-400">4 Sub-Unit Cohorts</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Unit Mean Fatigue</span>
          <div className="text-xl font-bold text-amber-400">5.4 / 10</div>
          <span className="text-[11px] text-slate-400">Baseline nominal</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">k-Anonymity Guard</span>
          <div className="text-xl font-bold text-emerald-400">Active (k=20)</div>
          <span className="text-[11px] text-slate-400">Zero individual inference</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Stand-Down Priority</span>
          <div className="text-xl font-bold text-slate-200">Alpha Coy</div>
          <span className="text-[11px] text-slate-400">Continuous 82-day spell</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#111A2B] border border-[#1E2D4A] rounded-xl text-xs">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isCurrent = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors ${
                isCurrent 
                  ? 'bg-[#162238] text-amber-300 border border-amber-500/40 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#162238]/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commanderHeatmap.map((item, idx) => {
              const isHighFatigue = item.avg_fatigue_index > 6.5;
              const isModFatigue = item.avg_fatigue_index > 4.5;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl bg-[#111A2B] border transition-colors ${
                    item.is_suppressed 
                      ? 'border-dashed border-[#1E2D4A]' 
                      : isHighFatigue 
                        ? 'border-rose-500/30' 
                        : isModFatigue 
                          ? 'border-amber-500/30' 
                          : 'border-[#1E2D4A]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{item.cohort_name}</h4>
                      <p className="text-[11px] text-slate-400">{item.parent_unit} • {item.force_type}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0B1220] border border-[#1E2D4A] text-slate-300 font-mono text-xs font-semibold">
                      n = {item.total_personnel}
                    </span>
                  </div>

                  {item.is_suppressed ? (
                    <div className="p-4 bg-[#0B1220] border border-[#1E2D4A] rounded-xl text-center space-y-2 my-3">
                      <EyeOff className="w-5 h-5 text-slate-500 mx-auto" />
                      <h5 className="font-semibold text-slate-300 text-xs">Cohort Redacted (k-Anonymity Guard)</h5>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {item.suppression_reason || 'Cohort size is below the k=20 threshold.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 my-3">
                      {/* Fatigue Gauge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Mean Fatigue Index:</span>
                        <span className={`font-mono text-base font-bold ${
                          isHighFatigue ? 'text-rose-400' : isModFatigue ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {item.avg_fatigue_index} <span className="text-xs font-normal text-slate-500">/ 10.0</span>
                        </span>
                      </div>

                      {/* Stacked Risk Distribution Bar */}
                      {item.risk_distribution && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Aggregate Risk Breakdown:</span>
                            <span className="text-slate-300">
                              {item.risk_distribution.elevated + item.risk_distribution.critical} High / {item.total_personnel}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[#0B1220] rounded-full overflow-hidden flex">
                            <div style={{ width: `${(item.risk_distribution.low / item.total_personnel)*100}%` }} className="bg-emerald-500" title="Low Risk" />
                            <div style={{ width: `${(item.risk_distribution.moderate / item.total_personnel)*100}%` }} className="bg-sky-500" title="Moderate Risk" />
                            <div style={{ width: `${(item.risk_distribution.elevated / item.total_personnel)*100}%` }} className="bg-amber-500" title="Elevated Risk" />
                            <div style={{ width: `${(item.risk_distribution.critical / item.total_personnel)*100}%` }} className="bg-rose-500" title="Critical Risk" />
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 bg-[#0B1220] rounded-lg text-[11px] text-slate-300 border border-[#1E2D4A]">
                        <strong className="text-amber-400 block mb-0.5">Recommendation:</strong>
                        {item.rotation_recommendation}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'kanon' && <KAnonDemo />}
      {activeSubTab === 'cohesion' && <CohesionAnomalies />}
      {activeSubTab === 'rotation' && <RotationAdvisor />}

    </div>
  );
}
