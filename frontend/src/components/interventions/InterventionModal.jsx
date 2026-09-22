import React, { useState } from 'react';
import { MessageCircle, X, Shield } from 'lucide-react';
import { logWelfareIntervention } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function InterventionModal({ isOpen, close, currentCase, onInterventionLogged }) {
  const { showToast, refreshGlobalData, currentUser } = useAppState();

  const [kind, setKind] = useState('welfare_counseling');
  const [notes, setNotes] = useState('');
  const [targetConcern, setTargetConcern] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !currentCase) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg('Please enter intervention notes.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await logWelfareIntervention(currentCase.case_id, kind, notes.trim(), {
        targetConcern: targetConcern || null,
        followUpDate: followUpDate || null
      });
      showToast('Welfare intervention recorded successfully.', 'success');
      refreshGlobalData();
      if (onInterventionLogged) {
        onInterventionLogged(res.intervention || {
          intervention_id: `INT-${Date.now()}`,
          case_id: currentCase.case_id,
          kind,
          performed_at: new Date().toISOString(),
          notes_sanitized: notes.trim(),
          performed_by_role: 'welfare_officer',
          officer_id: currentUser?.serviceNo || 'WO-7742'
        });
      }
      close();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record intervention.');
      showToast('Intervention recording failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14332d]/30 backdrop-blur-[2px] p-4 animate-fade-in"
      onClick={close}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl border border-[#dbe8e1] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#eaf5ef] text-[#286c58]">
            <MessageCircle size={18} />
          </div>
          <button onClick={close} className="text-[#9aa7a2] hover:text-[#52645e] transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-4 font-serif text-[22px] font-semibold text-[#21453b]">Log welfare intervention</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6f8079]">
          Record a care action, informal check-in, or rest recommendation for{' '}
          <span className="font-semibold text-[#18342e]">{currentCase.case_id}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-[#f7d6cd] bg-[#fae6e0] p-2.5 text-xs text-[#a55342]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#587068]">Action Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] px-3 py-2.5 text-[12px] text-[#18342e] outline-none focus:border-[#77a993]"
            >
              <option value="welfare_counseling">Welfare Counseling & Informal Connect</option>
              <option value="peer_buddy_nudge">Peer Buddy Nudge (Informal)</option>
              <option value="operational_rest_rotation">Operational Stand-Down / 72h Rest Rotation</option>
              <option value="clinical_referral">Tele-MANAS (14416) / Medical Officer Connect</option>
              <option value="routine_contact">Routine Welfare Follow-Up</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#587068]">Target concern (optional)</label>
            <select
              value={targetConcern}
              onChange={(e) => setTargetConcern(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] px-3 py-2.5 text-[12px] text-[#18342e] outline-none focus:border-[#77a993]"
            >
              <option value="">Select concern…</option>
              <option value="sleep_fatigue">Sleep / fatigue</option>
              <option value="leave_separation">Leave / family separation</option>
              <option value="workload_tempo">Workload / operational tempo</option>
              <option value="post_leave_reentry">Post-leave re-entry</option>
              <option value="acute_distress">Acute distress</option>
              <option value="general_checkin">General check-in</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#587068]">Follow-up date (optional)</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] px-3 py-2.5 text-[12px] text-[#18342e] outline-none focus:border-[#77a993]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#587068]">Sanitized Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 h-28 w-full resize-none rounded-xl border border-[#dce6e0] bg-[#fbfdfb] p-3 text-[12px] text-[#18342e] outline-none focus:border-[#77a993]"
              placeholder="Record support offered, mutually agreed next step, and follow-up timeline..."
              required
            />
          </div>

          <div className="rounded-xl border border-[#dfe8e3] bg-[#f7faf8] p-3 text-[11px] text-[#647773] flex items-center gap-2">
            <Shield size={14} className="shrink-0 text-[#286c58]" />
            <span>Notes are non-punitive and permanently tied to this case in the audit ledger.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3.5 py-2.5 text-[11px] font-bold text-[#6f8079] hover:bg-[#f0f5f2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[#174c42] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#123e39] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Recording...' : 'Record intervention'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
