import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Fingerprint,
  MessageCircle,
  LockKeyhole,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageIntro } from '../layout/PageIntro';
import {
  Avatar,
  Risk,
  Signal,
  getCaseInitials,
  getCasePseudonymName,
  getCaseTone,
  getRiskLabel,
  getPrimarySignal,
  formatTimeAgo
} from './caseHelpers';
import { BreakGlassModal } from '../auth/BreakGlassModal';
import { InterventionModal } from '../interventions/InterventionModal';
import { BackendErrorState, DemoModeBanner } from '../common/DemoModeBanner';
import { fetchCaseDetail, submitOfficerLabel, recordInterventionOutcome, changeCaseStatus } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function CaseDetailView() {
  const { showToast, refreshGlobalData, welfareCases } = useAppState();
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [reasonMeta, setReasonMeta] = useState([]);
  const [interventionsList, setInterventionsList] = useState([]);
  const [trajectory, setTrajectory] = useState(null);

  const [calibrationLabel, setCalibrationLabel] = useState(null);
  const [calibrationNotes, setCalibrationNotes] = useState('');
  const [isSubmittingLabel, setIsSubmittingLabel] = useState(false);

  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [resolvedIdentity, setResolvedIdentity] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [outcomeDraft, setOutcomeDraft] = useState({});
  const [isSavingOutcome, setIsSavingOutcome] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const NEXT_STATUS_LABELS = {
    in_review: 'Mark in review',
    intervention_active: 'Resume intervention',
    follow_up_due: 'Schedule follow-up',
    escalated: 'Escalate',
    declined: 'Decline (no concern)',
    closed: 'Close case'
  };

  const reloadCase = async () => {
    try {
      const res = await fetchCaseDetail(caseId);
      if (res?.case) setCaseData(res.case);
      if (res?.reason_metadata) setReasonMeta(res.reason_metadata);
      if (res?.interventions) setInterventionsList(res.interventions);
      if (res?.trajectory) setTrajectory(res.trajectory);
      refreshGlobalData();
    } catch (err) {
      showToast(err?.message || 'Failed to reload case.', 'error');
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!caseId) return;
      try {
        setLoadError(null);
        const res = await fetchCaseDetail(caseId);
        if (isMounted && res) {
          if (res.case) setCaseData(res.case);
          if (res.reason_metadata) setReasonMeta(res.reason_metadata);
          if (res.interventions) setInterventionsList(res.interventions);
          if (res.trajectory) setTrajectory(res.trajectory);
          if (res.case?.officer_label) setCalibrationLabel(res.case.officer_label);
        }
      } catch (err) {
        console.error('Failed to load case detail:', err);
        if (isMounted) setLoadError(err?.message || 'Case detail could not be loaded.');
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [caseId]);

  const handleCalibrationSubmit = async (label) => {
    setIsSubmittingLabel(true);
    try {
      await submitOfficerLabel(caseId, label, calibrationNotes);
      setCalibrationLabel(label);
      showToast(`Case marked as: ${label.replace(/_/g, ' ')}`, 'success');
      refreshGlobalData();
    } catch (err) {
      showToast(err?.message || 'Failed to save calibration feedback', 'error');
    } finally {
      setIsSubmittingLabel(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    setIsChangingStatus(true);
    try {
      await changeCaseStatus(caseId, nextStatus);
      showToast(`Case status: ${nextStatus.replace(/_/g, ' ')}`, 'success');
      await reloadCase();
    } catch (err) {
      showToast(err?.message || 'Status change failed.', 'error');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleOutcomeRecord = async (interventionId) => {
    const draft = outcomeDraft[interventionId] || {};
    if (!draft.outcome) {
      showToast('Select an outcome first.', 'error');
      return;
    }
    setIsSavingOutcome(true);
    try {
      await recordInterventionOutcome(
        caseId,
        interventionId,
        draft.outcome,
        draft.score ? Number(draft.score) : null,
        draft.notes || null
      );
      showToast(`Outcome recorded: ${draft.outcome.replace(/_/g, ' ')}`, 'success');
      setOutcomeDraft((prev) => ({ ...prev, [interventionId]: {} }));
      await reloadCase();
    } catch (err) {
      showToast(err?.message || 'Failed to record outcome.', 'error');
    } finally {
      setIsSavingOutcome(false);
    }
  };

  const handleInterventionLogged = (newInt) => {
    setInterventionsList((prev) => [newInt, ...prev]);
    setCaseData((prev) => prev ? { ...prev, status: 'intervention_active' } : prev);
  };

  // Falls back to the queue row while the detail request is in flight.
  const c = caseData || (welfareCases || []).find((item) => item.case_id === caseId) || {
    case_id: caseId || 'CASE-UNKNOWN',
    pseudonym_id: 'loading...',
    tier: 'elevated',
    status: 'open',
    unit_context: 'Sector Unit',
    reason_codes: ['RC_SUSTAINED_DEPLOYMENT']
  };

  const STATUS_TRANSITIONS = {
    open: ['in_review', 'intervention_active', 'declined', 'escalated'],
    in_review: ['intervention_active', 'declined', 'escalated', 'closed'],
    intervention_active: ['follow_up_due', 'closed', 'escalated'],
    follow_up_due: ['intervention_active', 'closed', 'escalated'],
    escalated: ['intervention_active', 'closed'],
    declined: [],
    closed: []
  };
  const nextStates = STATUS_TRANSITIONS[c.status] || [];

  return (
    <>
      <DemoModeBanner />
      {loadError && (
        <div className="mb-4">
          <BackendErrorState message={loadError} onRetry={() => window.location.reload()} />
        </div>
      )}
      <button
        onClick={() => navigate('/welfare/cases')}
        className="mb-5 flex items-center gap-2 text-[11px] font-bold text-[#46816e] hover:text-[#174c42] transition-colors"
      >
        <ArrowLeft size={14} /> Back to cases
      </button>

      <PageIntro
        title={`${getCasePseudonymName(c)} · ${c.case_id}`}
        description={`${c.unit_context || 'CRPF 144 Bn (CI Ops)'} · Dedicated welfare case view`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setBreakGlassOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[#dce6e0] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-[#557068] hover:bg-[#f8fbf9] transition-colors"
            >
              <Fingerprint size={15} /> Request identity access
            </button>
            <button
              onClick={() => setInterventionModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#174c42] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#123e39] transition-colors"
            >
              <MessageCircle size={15} /> Start intervention
            </button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <div className="flex items-start justify-between border-b border-[#edf1ef] px-5 py-5 sm:px-6">
            <div className="flex gap-3">
              <Avatar initials={getCaseInitials(c)} tone={getCaseTone(c.tier)} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-[#25443b]">{getCasePseudonymName(c)}</h2>
                  <Risk value={getRiskLabel(c.tier)} />
                  {c.has_acute_marker && (
                    <span className="rounded-full bg-[#fae6e0] px-2 py-0.5 text-[10px] font-semibold text-[#a55342]">
                      Acute Distress
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[#899791] font-mono">
                  {c.case_id} · {c.pseudonym_id ? `${c.pseudonym_id.slice(0, 8)}…` : ''}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#397c68] capitalize">
              {c.status?.replace(/_/g, ' ') || 'Open'}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#9a6d35]">
                <Sparkles size={15} />
                <span>Why this was flagged</span>
              </div>
              <div className="rounded-xl border border-[#f0e5ce] bg-[#fffaf0] p-4">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-[#bf8141]" size={17} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#60472d]">
                      {getPrimarySignal(c.reason_codes)}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8a7155]">
                      {c.has_acute_marker
                        ? 'Urgent acute emotional distress pattern detected. Rapid-response welfare protocol initiated.'
                        : 'Significant deviation from unit baseline detected. Closed-vocabulary reason codes indicate sustained operational stress.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {reasonMeta && reasonMeta.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a94]">
                  Operational Reason Codes & Recommended Actions
                </div>
                <div className="space-y-2">
                  {reasonMeta.map((meta) => (
                    <div
                      key={meta.code}
                      className="rounded-xl border border-[#dfe8e3] bg-[#fbfdfb] p-3.5 text-xs text-[#2d453e]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#18342e]">{meta.title}</div>
                        <span className="rounded bg-[#eaf3ed] px-1.5 py-0.5 text-[9px] font-bold text-[#27705c]">
                          Signal strength {meta.severity_weight}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#6c7d78]">{meta.description}</p>
                      {meta.recommended_action && (
                        <div className="mt-2 text-[11px] text-[#27705c] font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>Recommended: {meta.recommended_action}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Signal
                label="Operational Hazard Band"
                value={`Band ${c.h_band || 3} of 4`}
                tone={c.h_band >= 3 ? 'amber' : 'green'}
              />
              <Signal
                label="Recent Trend"
                value={
                  !trajectory || trajectory.trend === 'insufficient_history'
                    ? 'Insufficient history'
                    : trajectory.trend.charAt(0).toUpperCase() + trajectory.trend.slice(1)
                }
                tone={trajectory?.trend === 'rising' ? 'amber' : 'green'}
              />
              <Signal
                label="Signal Ingestion"
                value={c.origin === 'device_fusion' ? 'On-Device Fusion' : 'HR Operational Stream'}
                tone="slate"
              />
              <Signal
                label="Detected"
                value={formatTimeAgo(c.opened_at)}
                tone="slate"
              />
            </div>
            {trajectory?.note && (
              <p className="text-[11px] text-[#8a9a94]">
                {trajectory.note}
                {trajectory.previous_tier && trajectory.current_tier
                  ? ` Previous: ${trajectory.previous_tier} → current: ${trajectory.current_tier}.`
                  : ''}
              </p>
            )}

            <div className="border-t border-[#edf1ef] pt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a94]">
                Welfare Officer Calibration Feedback
              </div>
              <p className="mb-2 text-[10px] text-[#8a9a94]">
                Captured for evaluation and future retraining. Does not update the production model.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'true_concern', label: 'True Concern' },
                  { id: 'operational_artifact', label: 'Operational Artifact' },
                  { id: 'false_positive', label: 'False Positive' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => handleCalibrationSubmit(btn.id)}
                    disabled={isSubmittingLabel}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      calibrationLabel === btn.id
                        ? 'bg-[#174c42] text-white'
                        : 'border border-[#dce6e0] bg-white text-[#557068] hover:bg-[#f8fbf9]'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#edf1ef] pt-5">
              <button
                onClick={() => setInterventionModalOpen(true)}
                className="rounded-lg bg-[#174c42] px-3.5 py-2.5 text-[11px] font-bold text-white hover:bg-[#123e39] transition-colors"
              >
                Start intervention
              </button>
              <button
                onClick={() => setBreakGlassOpen(true)}
                className="rounded-lg border border-[#dce6e0] px-3.5 py-2.5 text-[11px] font-bold text-[#557068] hover:bg-[#f8fbf9] transition-colors"
              >
                Request identity access
              </button>
            </div>

            {nextStates.length > 0 && (
              <div className="border-t border-[#edf1ef] pt-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a94]">
                  Case workflow — currently: {(c.status || 'open').replace(/_/g, ' ')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextStates.map((next) => (
                    <button
                      key={next}
                      onClick={() => handleStatusChange(next)}
                      disabled={isChangingStatus}
                      className="rounded-lg border border-[#dce6e0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#557068] hover:bg-[#f8fbf9] transition-colors disabled:opacity-50"
                    >
                      {NEXT_STATUS_LABELS[next] || next}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dfe8e3] bg-[#eaf5ef] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-[#286c58]">
              <Fingerprint size={18} />
              <span className="text-[11px] font-bold uppercase tracking-[0.13em]">Privacy & care</span>
            </div>
            <h3 className="font-serif text-[20px] leading-snug text-[#214c3f]">A person, not a profile.</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-[#668078]">
              Identity is protected unless access is strictly necessary, authorized by dual custodians, and recorded.
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-[#d2e8db] pt-4 text-[11px] font-semibold text-[#3d7764]">
              <LockKeyhole size={14} /> All access is audit logged
            </div>
          </div>

          {resolvedIdentity && (
            <div className="rounded-2xl border border-[#d1e7da] bg-white p-5 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#27705c] flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Revealed Service Identity
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#708780] block">Name</span>
                  <span className="font-semibold text-[#18342e]">{resolvedIdentity.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#708780] block">Service Number</span>
                  <span className="font-mono font-semibold text-[#18342e]">{resolvedIdentity.service_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#708780] block">Rank & Unit</span>
                  <span className="text-[#3b554c]">{resolvedIdentity.rank} · {resolvedIdentity.unit}</span>
                </div>
                <p className="text-[10px] text-[#708780]">Minimum-necessary disclosure only. Sensitive fields are withheld by policy.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[19px] font-semibold text-[#25443b]">Intervention history</h2>
            <p className="mt-1 text-[11px] text-[#899791]">A clear record of support, not surveillance</p>
          </div>
          <button
            onClick={() => setInterventionModalOpen(true)}
            className="rounded-lg bg-[#174c42] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#123e39] transition-colors"
          >
            + New action
          </button>
        </div>

        {interventionsList.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8a9a94]">
            No interventions recorded yet for this case. Click "Start intervention" above to log one.
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ef]">
            {interventionsList.map((intItem, idx) => (
              <div key={intItem.intervention_id || idx} className="relative py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex size-2.5 rounded-full border-2 border-white bg-[#6eaa8b] ring-1 ring-[#cfe2d8]" />
                    <div>
                      <div className="text-[12px] font-semibold text-[#3b554c] capitalize">
                        {intItem.kind ? intItem.kind.replace(/_/g, ' ') : 'Welfare Intervention'}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#81918b]">
                        {intItem.notes_sanitized || 'Support conversation recorded.'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                        {intItem.target_concern && (
                          <span className="rounded-md bg-[#f0f5f2] px-2 py-0.5 font-semibold text-[#557068]">
                            Concern: {intItem.target_concern.replace(/_/g, ' ')}
                          </span>
                        )}
                        {intItem.follow_up_date && (
                          <span className="rounded-md bg-[#f0f5f2] px-2 py-0.5 font-semibold text-[#557068]">
                            Follow-up: {intItem.follow_up_date}
                          </span>
                        )}
                        {intItem.outcome && (
                          <span className="rounded-md bg-[#eaf5ef] px-2 py-0.5 font-bold text-[#27705c]">
                            Outcome: {intItem.outcome.replace(/_/g, ' ')}
                            {intItem.outcome_score ? ` (${intItem.outcome_score}/5)` : ''}
                          </span>
                        )}
                      </div>
                      {!intItem.outcome && intItem.intervention_id && !intItem.intervention_id.startsWith('DEMO') && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <select
                            value={(outcomeDraft[intItem.intervention_id] || {}).outcome || ''}
                            onChange={(e) => setOutcomeDraft((prev) => ({
                              ...prev,
                              [intItem.intervention_id]: { ...(prev[intItem.intervention_id] || {}), outcome: e.target.value }
                            }))}
                            className="rounded-lg border border-[#dce6e0] bg-white px-2 py-1.5 text-[11px] text-[#18342e] outline-none"
                          >
                            <option value="">Record outcome…</option>
                            <option value="improved">Improved</option>
                            <option value="stable">Stable</option>
                            <option value="needs_follow_up">Needs follow-up</option>
                            <option value="escalated">Escalated</option>
                            <option value="unable_to_assess">Unable to assess</option>
                          </select>
                          <select
                            value={(outcomeDraft[intItem.intervention_id] || {}).score || ''}
                            onChange={(e) => setOutcomeDraft((prev) => ({
                              ...prev,
                              [intItem.intervention_id]: { ...(prev[intItem.intervention_id] || {}), score: e.target.value }
                            }))}
                            className="rounded-lg border border-[#dce6e0] bg-white px-2 py-1.5 text-[11px] text-[#18342e] outline-none"
                            title="Optional outcome score"
                          >
                            <option value="">Score…</option>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <option key={s} value={s}>{s}/5</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleOutcomeRecord(intItem.intervention_id)}
                            disabled={isSavingOutcome}
                            className="rounded-lg bg-[#286c58] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1f5444] disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-[#91a19b]">
                      {formatTimeAgo(intItem.performed_at)}
                    </div>
                    <div className="text-[10px] font-medium text-[#27705c]">
                      {intItem.officer_id || 'WO-7742'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {breakGlassOpen && (
        <BreakGlassModal
          isOpen={breakGlassOpen}
          close={() => setBreakGlassOpen(false)}
          currentCase={c}
          onIdentityResolved={setResolvedIdentity}
        />
      )}

      {interventionModalOpen && (
        <InterventionModal
          isOpen={interventionModalOpen}
          close={() => setInterventionModalOpen(false)}
          currentCase={c}
          onInterventionLogged={handleInterventionLogged}
        />
      )}
    </>
  );
}
