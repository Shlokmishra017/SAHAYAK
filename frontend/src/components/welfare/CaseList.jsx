import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  ChevronRight, 
  Filter, 
  UserCheck, 
  Activity, 
  Users 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { StatusBadge, ReasonTag } from '../common/CommonUI';
import { CaseDetailModal } from './CaseDetailModal';

export function CaseList() {
  const { welfareCases } = useAppState();
  const [selectedTier, setSelectedTier] = useState('all');
  const [activeCase, setActiveCase] = useState(null);

  const filteredCases = welfareCases.filter(c => {
    if (selectedTier !== 'all' && c.tier !== selectedTier) return false;
    return true;
  });

  const criticalCount = welfareCases.filter(c => c.tier === 'critical').length;
  const elevatedCount = welfareCases.filter(c => c.tier === 'elevated').length;

  return (
    <div className="space-y-6">
      
      {/* Personnel Wellness Overview Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Active Monitored</span>
          <div className="text-xl font-bold text-white">144</div>
          <span className="text-[11px] text-slate-400">CRPF 144 Bn Battalion</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Check-in Completion</span>
          <div className="text-xl font-bold text-emerald-400">92.4%</div>
          <span className="text-[11px] text-slate-400">Past 24 hours</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Elevated Fatigue</span>
          <div className="text-xl font-bold text-amber-400">{elevatedCount + criticalCount}</div>
          <span className="text-[11px] text-slate-400">Above unit baseline</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Requiring Attention</span>
          <div className="text-xl font-bold text-rose-400">{criticalCount || 2}</div>
          <span className="text-[11px] text-slate-400">Triage priority</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111A2B] border border-[#1E2D4A] p-3.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-300">Filter By Severity:</span>
          {['all', 'critical', 'elevated', 'emerging'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1 rounded-lg font-medium uppercase text-[10px] transition-colors ${
                selectedTier === t
                  ? 'bg-[#162238] text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-[#0B1220] border border-[#1E2D4A] text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>Active Queue:</span>
          <span className="px-2 py-0.5 rounded bg-[#162238] text-amber-300 font-mono font-medium border border-[#1E2D4A]">
            {filteredCases.length}
          </span>
        </div>
      </div>

      {/* Case List */}
      <div className="space-y-3">
        {filteredCases.map(item => (
          <div
            key={item.case_id}
            onClick={() => setActiveCase(item)}
            className="p-4 rounded-xl bg-[#111A2B] hover:bg-[#142034] border border-[#1E2D4A] hover:border-slate-600 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {item.case_id}
                </span>
                <StatusBadge tier={item.tier} />
                <span className="text-[11px] text-slate-300">
                  Unit: <strong>{item.unit_context}</strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  • Detected {new Date(item.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Reason Tags */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {item.reason_codes.map((code, idx) => (
                  <ReasonTag key={idx} code={code} />
                ))}
              </div>

              {item.has_acute_marker && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Acute Signal Active • Tele-MANAS Fast-Track Protocol</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono">Pseudonym ID</span>
                <span className="text-xs font-mono text-slate-300">{item.pseudonym_id.slice(0, 13)}...</span>
              </div>

              <button className="px-3 py-1.5 rounded-lg bg-[#162238] border border-[#1E2D4A] hover:bg-[#1D2D49] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors">
                <span>Inspect Case</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="p-8 text-center bg-[#111A2B] border border-[#1E2D4A] rounded-xl text-slate-400 space-y-2">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="font-medium text-white text-xs">No active cases matching selected filter.</p>
            <p className="text-[11px]">All personnel in this category are nominal.</p>
          </div>
        )}
      </div>

      {/* Case Detail Modal */}
      {activeCase && (
        <CaseDetailModal
          caseItem={activeCase}
          onClose={() => setActiveCase(null)}
        />
      )}

    </div>
  );
}
