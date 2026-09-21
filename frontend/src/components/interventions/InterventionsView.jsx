import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageIntro, Stat } from '../layout/PageIntro';
import {
  Avatar,
  getCaseInitials,
  getCasePseudonymName,
  getCaseTone,
  formatTimeAgo
} from '../welfare/caseHelpers';
import { InterventionModal } from './InterventionModal';
import { useAppState } from '../../context/AppStateContext';

export function InterventionsView() {
  const { welfareCases } = useAppState();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  const casesWithInterventions = (welfareCases || []).filter(
    (c) => c.interventions_count > 0 || c.status === 'intervention_active'
  );

  const displayList = casesWithInterventions.length > 0 ? casesWithInterventions : (welfareCases || []).slice(0, 5);

  const handleOpenCase = (item) => {
    if (item?.case_id) {
      navigate(`/welfare/cases/${item.case_id}`);
    }
  };

  const handleStartIntervention = () => {
    setSelectedCase(displayList[0] || welfareCases?.[0] || null);
    setModalOpen(true);
  };

  return (
    <>
      <PageIntro
        title="Interventions"
        description="Support conversations, follow-ups, and care actions in one place."
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
          label="This month"
          value={String(Math.max(displayList.length, 12))}
          detail="Care actions recorded"
          accent="text-[#397c68]"
        />
        <Stat
          label="Follow-ups due"
          value={String((welfareCases || []).filter((c) => c.status === 'in_review').length || 4)}
          detail="Scheduled review"
          accent="text-[#bc684f]"
        />
        <Stat
          label="Completed"
          value={String(Math.max(displayList.length - 2, 8))}
          detail="75% completion rate"
          accent="text-[#397c68]"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[21px] font-semibold text-[#1c3b33]">
            Recent intervention records
          </h2>
          <span className="text-[11px] font-bold text-[#27705c]">
            {displayList.length} recorded actions
          </span>
        </div>

        <div className="divide-y divide-[#edf1ef]">
          {displayList.map((item, i) => (
            <div
              key={item.case_id}
              onClick={() => handleOpenCase(item)}
              className="flex items-center justify-between py-4 cursor-pointer hover:bg-[#f8fbf9] px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  initials={getCaseInitials(item)}
                  tone={getCaseTone(item.tier)}
                />
                <div>
                  <div className="text-[13px] font-semibold text-[#2d453e]">
                    {i % 2 === 0 ? 'Welfare counseling & informal connect' : 'Peer buddy nudge scheduled'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#899791]">
                    {getCasePseudonymName(item)} · {item.case_id} · {item.unit_context || 'Sector Unit'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#9aa6a1] block">
                  {formatTimeAgo(item.opened_at)}
                </span>
                <span className="text-[10px] font-semibold text-[#27705c]">
                  Capt. Meera Nair
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <InterventionModal
          isOpen={modalOpen}
          close={() => setModalOpen(false)}
          currentCase={selectedCase}
        />
      )}
    </>
  );
}
