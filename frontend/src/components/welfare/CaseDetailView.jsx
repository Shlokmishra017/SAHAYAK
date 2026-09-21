import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Fingerprint,
  MessageCircle,
  LockKeyhole,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
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
import { fetchCaseDetail, submitOfficerLabel } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function CaseDetailView() {
  const { showToast, refreshGlobalData, welfareCases } = useAppState();
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [reasonMeta, setReasonMeta] = useState([]);
  const [interventionsList, setInterventionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calibration label state
  const [calibrationLabel, setCalibrationLabel] = useState(null);
  const [calibrationNotes, setCalibrationNotes] = useState('');
  const [isSubmittingLabel, setIsSubmittingLabel] = useState(false);

  // Modals
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [resolvedIdentity, setResolvedIdentity] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!caseId) return;
      setIsLoading(true);
      try {
        const res = await fetchCaseDetail(caseId);
        if (isMounted && res) {
          if (res.case) setCaseData(res.case);
          if (res.reason_metadata) setReasonMeta(res.reason_metadata);
          if (res.interventions) setInterventionsList(res.interventions);
          if (res.case?.officer_label) setCalibrationLabel(res.case.officer_label);
        }
      } catch (err) {
        console.error('Failed to load case detail:', err);
      } finally {
        if (isMounted) setIsLoading(false);
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
      showToast('Failed to save calibration feedback', 'error');
    } finally {
      setIsSubmittingLabel(false);
    }
  };

  const handleInterventionLogged = (newInt) => {
    setInterventionsList((prev) => [newInt, ...prev]);
    setCaseData((prev) => prev ? { ...prev, status: 'intervention_active' } : prev);
  };

  // Fallback to local list item if loading
  const c = caseData || (welfareCases || []).find((item) => item.case_id === caseId) || {
    case_id: caseId || 'CASE-UNKNOWN',
    pseudonym_id: 'loading...',
    tier: 'elevated',
    status: 'open',
    unit_context: 'Sector Unit',
    reason_codes: ['RC_SUSTAINED_DEPLOYMENT']
  };

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => navigate('/welfare/cases')}
        className="mb-5 flex items-center gap-2 text-[11px] font-bold text-[#46816e] hover:text-[#174c42] transition-colors"
      >
        <ArrowLeft size={14} /> Back to cases
      </button>

      {/* Page Intro */}
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

      {/* Main Grid: Detail Card + Privacy Card */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        {/* Left: Detail Card */}
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
                  {c.case_id} · {c.pseudonym_id}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#397c68] capitalize">
              {c.status?.replace(/_/g, ' ') || 'Open'}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Why this was flagged */}
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

            {/* Detailed Reason Codes from Backend Metadata */}
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
                          Weight {meta.severity_weight}
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

            {/* Risk Signals Grid */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Signal
                label="Operational Hazard Band"
                value={`Band ${c.h_band || 3} of 4`}
                tone={c.h_band >= 3 ? 'amber' : 'green'}
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

            {/* Officer Calibration Feedback */}
            <div className="border-t border-[#edf1ef] pt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a94]">
                Welfare Officer Calibration Feedback
              </div>
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

            {/* Bottom Actions */}
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
          </div>
        </div>

        {/* Right: Privacy & Care Card */}
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

          {/* If identity resolved via break glass */}
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
                <div>
                  <span className="text-[10px] text-[#708780] block">Emergency Contact</span>
                  <span className="text-[#3b554c]">{resolvedIdentity.emergency_contact_name} ({resolvedIdentity.emergency_contact_phone})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intervention History Section */}
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

      {/* Break-Glass Modal */}
      {breakGlassOpen && (
        <BreakGlassModal
          isOpen={breakGlassOpen}
          close={() => setBreakGlassOpen(false)}
          currentCase={c}
          onIdentityResolved={setResolvedIdentity}
        />
      )}

      {/* Intervention Modal */}
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
