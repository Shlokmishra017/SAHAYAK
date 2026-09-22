import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageIntro, Stat } from '../layout/PageIntro';
import { BackendErrorState, DemoModeBanner } from '../common/DemoModeBanner';
import {
  Avatar,
  formatTimeAgo
} from '../welfare/caseHelpers';
import { InterventionModal } from './InterventionModal';
import { fetchRecentInterventions } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function InterventionsView() {
  const { welfareCases } = useAppState();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecent = async () => {
    try {
      setLoadError(null);
      const data = await fetchRecentInterventions(20);
      setRecent(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.message || 'Interventions could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const cases = welfareCases || [];
  const activeCount = cases.filter((c) => c.status === 'intervention_active').length;
  const followUpCount = cases.filter((c) => c.status === 'follow_up_due').length;
  const withOutcome = recent.filter((r) => r.outcome).length;

  const handleOpenCase = (caseId) => {
    if (caseId) navigate(`/welfare/cases/${caseId}`);
  };

  const handleStartIntervention = () => {
    setSelectedCase(cases[0] || null);
    setModalOpen(true);
  };

  return (
    <>
      <DemoModeBanner />
      {loadError && (
        <div className="mb-4">
          <BackendErrorState message={loadError} onRetry={loadRecent} />
        </div>
      )}
      <PageIntro
        title="Interventions"
        description="Support conversations, follow-ups, and recorded outcomes in one place."
        action={
          <button
            onClick={handleStartIntervention}
            className="flex items-center gap-2 rounded-xl bg-[#174c42] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#123e39] transition-colors"
          >
            <Plus size={15} /> Log intervention
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Active interventions"
          value={String(activeCount)}
          detail="Cases in intervention"
          accent="text-[#397c68]"
        />
        <Stat
          label="Follow-ups due"
          value={String(followUpCount)}
          detail="Awaiting follow-up outcome"
          accent="text-[#bc684f]"
        />
        <Stat
          label="Outcomes recorded"
          value={String(withOutcome)}
          detail="In recent records below"
          accent="text-[#397c68]"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[21px] font-semibold text-[#1c3b33]">
            Recent intervention records
          </h2>
          <span className="text-[11px] font-bold text-[#27705c]">
            {recent.length} recorded actions
          </span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#8a9a94]">Loading interventions…</div>
        ) : recent.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8a9a94]">
            No interventions recorded yet. Log the first care action above.
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ef]">
            {recent.map((item) => (
              <div
                key={item.intervention_id}
                onClick={() => handleOpenCase(item.case_id)}
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-[#f8fbf9] px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    initials={(item.kind || 'WI').slice(0, 2).toUpperCase()}
                    tone={item.outcome ? 'green' : 'amber'}
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-[#2d453e] capitalize">
                      {(item.kind || 'welfare intervention').replace(/_/g, ' ')}
                      {item.outcome ? ` — ${item.outcome.replace(/_/g, ' ')}` : ''}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#899791]">
                      {item.case_id}
                      {item.target_concern ? ` · ${item.target_concern.replace(/_/g, ' ')}` : ''}
                      {item.follow_up_date ? ` · follow-up ${item.follow_up_date}` : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#9aa6a1] block">
                    {formatTimeAgo(item.performed_at)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#27705c]">
                    {item.officer_id || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <InterventionModal
          isOpen={modalOpen}
          close={() => setModalOpen(false)}
          currentCase={selectedCase}
          onInterventionLogged={loadRecent}
        />
      )}
    </>
  );
}
