import React, { useState } from 'react';
import { Plus, Check, Clock, User } from 'lucide-react';
import { logWelfareIntervention } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function InterventionLogger({ caseId }) {
  const { showToast, refreshGlobalData } = useAppState();
  const [kind, setKind] = useState('peer_buddy_nudge');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastInterventions, setPastInterventions] = useState([
    {
      id: 'INT-01',
      kind: 'peer_buddy_nudge',
      performed_by: 'WO_7742',
      date: '2026-09-11 08:30 UTC',
      notes: 'Prompted designated buddy (Havildar Kuldeep) for an informal check-in.'
    }
  ]);

  const interventionOptions = [
    { id: 'peer_buddy_nudge', label: 'Peer Buddy Check-in Nudge', desc: 'Discreet request to designated companion for informal connect' },
    { id: 'welfare_counseling', label: 'Informal Welfare Counseling', desc: 'Non-clinical confidential conversation with Unit Welfare Officer' },
    { id: 'duty_stand_down', label: '72-Hour Duty Stand-Down', desc: 'Operational rest rotation and temporary off-duty cycle' },
    { id: 'medical_leave_recommended', label: 'Compassionate / Medical Leave', desc: 'Recommendation for expedited leave review' },
    { id: 'family_liaison', label: 'Family Liaison Support', desc: 'Outreach to home state police / family welfare center' }
  ];

  const handleLog = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await logWelfareIntervention(caseId, kind, notes);
      setPastInterventions(prev => [
        {
          id: res.intervention?.intervention_id || `INT-${Date.now()}`,
          kind,
          performed_by: 'WO_7742',
          date: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          notes
        },
        ...prev
      ]);
      setNotes('');
      showToast("Intervention logged and hash-chained in audit ledger.", "success");
      refreshGlobalData();
    } catch (err) {
      showToast("Failed to log intervention.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Log Form */}
      <form onSubmit={handleLog} className="p-4 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-3">
        <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Record New Welfare Intervention</span>
        </h4>

        <div>
          <label className="text-[11px] text-slate-300 font-medium mb-1 block">Intervention Type:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {interventionOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKind(opt.id)}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  kind === opt.id
                    ? 'bg-[#162238] border-amber-500/50 text-slate-100'
                    : 'bg-[#111A2B] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-xs text-white">{opt.label}</div>
                <div className="text-[10px] text-slate-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-300 font-medium mb-1 block">
            Sanitized Welfare Notes (Non-clinical & Non-punitive):
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Discussed sleep schedule adjustment with Company Commander..."
            className="w-full bg-[#111A2B] border border-[#1E2D4A] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !notes.trim()}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 text-slate-900" />
          <span>{isSubmitting ? 'Recording...' : 'Log Intervention'}</span>
        </button>
      </form>

      {/* History */}
      <div className="space-y-2">
        <h5 className="font-medium text-slate-300 text-xs">Case Intervention History ({pastInterventions.length})</h5>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {pastInterventions.map(item => (
            <div key={item.id} className="p-3 bg-[#0B1220] border border-[#1E2D4A] rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-400 uppercase">{item.kind.replace(/_/g, ' ')}</span>
                <span className="text-slate-500 font-mono text-[10px]">{item.date}</span>
              </div>
              <p className="text-slate-300">{item.notes}</p>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>Logged by Officer ID: {item.performed_by}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
