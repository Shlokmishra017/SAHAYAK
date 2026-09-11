import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  HeartHandshake, 
  CheckCircle, 
  KeyRound, 
  UserX, 
  Sparkles,
  Info
} from 'lucide-react';
import { StatusBadge, ReasonTag } from '../common/CommonUI';
import { BreakGlassModal } from '../common/BreakGlassModal';
import { InterventionLogger } from './InterventionLogger';
import { LabelFeedbackLoop } from './LabelFeedbackLoop';

export function CaseDetailModal({ caseItem, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'interventions' | 'feedback'
  const [isBreakGlassOpen, setIsBreakGlassOpen] = useState(false);
  const [deAnonymizedIdentity, setDeAnonymizedIdentity] = useState(null);

  if (!caseItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-[#1E2D4A] p-6 bg-[#111A2B] shadow-modal relative flex flex-col overflow-hidden text-xs">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#1E2D4A] gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-sm font-mono font-bold text-amber-400">{caseItem.case_id}</span>
              <StatusBadge tier={caseItem.tier} />
              <span className="text-xs text-slate-400 font-mono">
                {deAnonymizedIdentity ? (
                  <strong className="text-rose-400 font-bold">{deAnonymizedIdentity.rank} {deAnonymizedIdentity.full_name} ({deAnonymizedIdentity.service_number})</strong>
                ) : (
                  `Pseudonym: ${caseItem.pseudonym_id.slice(0, 18)}...`
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assigned Unit: <strong className="text-slate-200">{caseItem.unit_context}</strong> • Channel: <span className="uppercase text-slate-300 font-mono text-[10px]">{caseItem.origin}</span>
            </p>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#162238] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 py-3 border-b border-[#1E2D4A] text-xs">
          {[
            { id: 'overview', label: 'SHAP Attribution', icon: Sparkles },
            { id: 'interventions', label: `Interventions (${caseItem.interventions_count || 0})`, icon: HeartHandshake },
            { id: 'feedback', label: 'Model Weak-Labeling', icon: CheckCircle }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isSel 
                    ? 'bg-[#162238] text-amber-300 border border-amber-500/40 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#162238]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="ml-auto">
            <button
              onClick={() => setIsBreakGlassOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
              title="Dual-Custodian Break-Glass Protocol"
            >
              <KeyRound className="w-3.5 h-3.5 text-rose-400" />
              <span>Dual Break-Glass</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4 pr-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              <div className="p-3 bg-[#0B1220] border border-[#1E2D4A] rounded-xl flex items-center justify-between text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Zero Raw Data Invariant:</strong> Raw journals and continuous mood scores never leave the client device.</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">SHAP Mapped</span>
              </div>

              {/* Explanations & Reason Codes */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white text-xs">Actionable Reason Codes (Aggregated Attribution)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {caseItem.reason_codes.map((code, idx) => (
                    <div key={idx} className="p-3.5 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <ReasonTag code={code} />
                        <span className="text-[10px] font-mono text-slate-500">Weight: High</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {code === 'RC_SUSTAINED_DEPLOYMENT' && 'Continuous active deployment spell exceeding 60 consecutive days without rest stand-down.'}
                        {code === 'RC_DENIED_LEAVE_CLUSTER' && 'Multiple denied leave applications in past 12 months (>50% denial rate).'}
                        {code === 'RC_POST_LEAVE_VULNERABILITY' && 'High vulnerability signature detected during critical 7-21 days following return from leave.'}
                        {code === 'RC_NIGHT_SHIFT_OVERLOAD' && 'Excessive continuous night shift hours with irregular shift rotations.'}
                        {code === 'RC_SLEEP_DEGRADATION_TREND' && 'Client-side EWMA trend indicates sleep duration dropping below 4.5h consecutively.'}
                        {code === 'RC_MOOD_TRAJECTORY_DROP' && 'Persistent downward slope in subjective wellness check-ins.'}
                        {code === 'RC_SOMATIC_FATIGUE_CLUSTER' && 'Repeated indicators of chronic physical fatigue.'}
                        {code === 'RC_ACUTE_DISTRESS_MARKER' && 'Acute emotional distress signal detected. Tele-MANAS safety fast-track active.'}
                      </p>
                      <div className="p-2 bg-[#111A2B] rounded-lg text-[11px] text-slate-300 border border-[#1E2D4A]">
                        <strong className="text-amber-400">Recommended Action: </strong>
                        {code === 'RC_SUSTAINED_DEPLOYMENT' && 'Schedule 72-hour operational rest rotation.'}
                        {code === 'RC_DENIED_LEAVE_CLUSTER' && 'Expedited compassionate leave review by Unit Welfare Board.'}
                        {code === 'RC_POST_LEAVE_VULNERABILITY' && 'Informal buddy check-in & family liaison follow-up.'}
                        {code === 'RC_NIGHT_SHIFT_OVERLOAD' && 'Roster adjustment to regularize sleep cycles.'}
                        {code === 'RC_SLEEP_DEGRADATION_TREND' && 'Fatigue mitigation & voluntary sleep hygiene consult.'}
                        {code === 'RC_ACUTE_DISTRESS_MARKER' && 'Immediate Tele-MANAS (14416) liaison & RMO support.'}
                        {code !== 'RC_SUSTAINED_DEPLOYMENT' && code !== 'RC_DENIED_LEAVE_CLUSTER' && code !== 'RC_POST_LEAVE_VULNERABILITY' && code !== 'RC_NIGHT_SHIFT_OVERLOAD' && code !== 'RC_SLEEP_DEGRADATION_TREND' && code !== 'RC_ACUTE_DISTRESS_MARKER' && 'Informal check-in with Unit Welfare Officer.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'interventions' && (
            <InterventionLogger caseId={caseItem.case_id} />
          )}

          {activeTab === 'feedback' && (
            <LabelFeedbackLoop caseId={caseItem.case_id} currentLabel={caseItem.officer_label} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#1E2D4A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-[#162238] hover:bg-[#1D2D49] rounded-lg border border-[#1E2D4A] transition-colors"
          >
            Close Case View
          </button>
        </div>

      </div>

      {/* Break Glass Modal */}
      <BreakGlassModal
        isOpen={isBreakGlassOpen}
        onClose={() => setIsBreakGlassOpen(false)}
        caseItem={caseItem}
        onDeAnonymized={(identity) => {
          setDeAnonymizedIdentity(identity);
        }}
      />
    </div>
  );
}
