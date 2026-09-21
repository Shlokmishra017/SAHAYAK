import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageIntro, Stat } from '../layout/PageIntro';
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
import { InterventionModal } from '../interventions/InterventionModal';
import { useAppState } from '../../context/AppStateContext';

export function Overview() {
  const { welfareCases, currentUser } = useAppState();
  const navigate = useNavigate();

  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [selectedCaseForModal, setSelectedCaseForModal] = useState(null);

  const openCasesCount = (welfareCases || []).filter((c) => c.status === 'open').length || welfareCases.length || 8;
  const followUpCount = (welfareCases || []).filter((c) => c.status === 'in_review' || c.status === 'intervention_active').length || 4;

  const todayStr = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const priorityCases = (welfareCases || []).slice(0, 4);
  const activePreview = priorityCases[0];

  const handleOpenCase = (item) => {
    if (item?.case_id) {
      navigate(`/welfare/cases/${item.case_id}`);
    }
  };

  const handleIntervene = (item) => {
    setSelectedCaseForModal(item || activePreview);
    setInterventionModalOpen(true);
  };

  return (
    <>
      <PageIntro
        eyebrow={todayStr}
        title={`Good day, ${currentUser?.name ? currentUser.name.split(' ')[0] : 'Officer'}.`}
        description="There are a few personnel who could use a closer look today."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/welfare/cases')}
              className="flex items-center gap-2 rounded-xl border border-[#dce6e0] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-[#557068] hover:bg-[#f8fbf9] transition-colors"
            >
              <ClipboardCheck size={15} /> All cases ({welfareCases?.length || 0})
            </button>
            <button
              onClick={() => handleIntervene(activePreview)}
              className="flex items-center gap-2 rounded-xl bg-[#174c42] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#123e39] transition-colors"
            >
              <Plus size={15} /> Log intervention
            </button>
          </div>
        }
      />

      {/* Top 4 Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Open cases"
          value={String(openCasesCount).padStart(2, '0')}
          detail="Active welfare attention"
          accent="text-[#bc684f]"
        />
        <Stat
          label="Follow-ups due"
          value={String(followUpCount).padStart(2, '0')}
          detail="In-review & scheduled"
          accent="text-[#397c68]"
        />
        <Stat
          label="Avg. response"
          value="18m"
          detail="↓ 12% this month"
          accent="text-[#397c68]"
        />
        <Stat
          label="Team check-in"
          value="86%"
          detail="Within expected range"
          accent="text-[#397c68]"
        />
      </div>

      {/* Cases Needing Attention Section */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[21px] font-semibold text-[#1c3b33]">Cases needing attention</h2>
          <p className="mt-1 text-[12px] text-[#83918d]">Prioritised by recency and welfare relevance</p>
        </div>
        <button
          onClick={() => navigate('/welfare/cases')}
          className="text-[11px] font-bold text-[#327460] hover:text-[#174c42] transition-colors flex items-center"
        >
          <span>View all cases</span>
          <ArrowUpRight className="ml-1 inline" size={12} />
        </button>
      </div>

      {/* Queue & Detail Preview Grid */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.98fr)_minmax(480px,1.28fr)]">
        {/* Priority Queue Card */}
        <div className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <div className="border-b border-[#edf1ef] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.13em] text-[#80918b]">
            Priority queue
          </div>
          <div className="divide-y divide-[#edf1ef]">
            {priorityCases.map((item) => (
              <button
                key={item.case_id}
                onClick={() => handleOpenCase(item)}
                className="flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f8fbf9]"
              >
                <Avatar
                  initials={getCaseInitials(item)}
                  tone={getCaseTone(item.tier)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#2d453e]">
                      {getCasePseudonymName(item)}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#9aa6a1]">
                      {formatTimeAgo(item.opened_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#899791]">
                    {item.unit_context || 'CRPF 144 Bn (CI Ops)'}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Risk value={getRiskLabel(item.tier)} />
                    <span className="truncate text-[10px] text-[#788a84]">
                      {getPrimarySignal(item.reason_codes)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="mt-2 shrink-0 text-[#bdc9c4]" size={16} />
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/welfare/cases')}
            className="flex w-full items-center justify-center gap-1 border-t border-[#edf1ef] py-3 text-[11px] font-bold text-[#46816e] hover:bg-[#f8fbf9] transition-colors"
          >
            <span>Open case list</span>
            <ArrowUpRight size={12} />
          </button>
        </div>

        {/* Selected Case Preview Card */}
        {activePreview && (
          <div className="rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <div className="flex items-start justify-between border-b border-[#edf1ef] px-5 py-5 sm:px-6">
              <div className="flex gap-3">
                <Avatar
                  initials={getCaseInitials(activePreview)}
                  tone={getCaseTone(activePreview.tier)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-[#25443b]">
                      {getCasePseudonymName(activePreview)}
                    </h2>
                    <Risk value={getRiskLabel(activePreview.tier)} />
                  </div>
                  <div className="mt-1 text-[11px] text-[#899791]">
                    {activePreview.case_id} · {activePreview.unit_context || 'Sector Unit'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleOpenCase(activePreview)}
                className="text-[11px] font-bold text-[#27705c] hover:underline"
              >
                Open case detail
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#9a6d35]">
                <Sparkles size={15} />
                <span>Why this was flagged</span>
              </div>
              <div className="rounded-xl border border-[#f0e5ce] bg-[#fffaf0] p-4">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-[#bf8141]" size={17} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#60472d]">
                      {getPrimarySignal(activePreview.reason_codes)}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8a7155]">
                      {activePreview.has_acute_marker
                        ? 'High-urgency acute distress marker detected. Recommended action: Immediate welfare check and Tele-MANAS protocol.'
                        : 'Significant deviation from unit baseline detected. Closed-vocabulary reason codes indicate sustained operational stress.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Signal
                  label="Signal Origin"
                  value={activePreview.origin === 'device_fusion' ? 'On-Device Fusion' : 'Operational HR'}
                  tone="amber"
                />
                <Signal
                  label="Risk Band"
                  value={`Hazard Band ${activePreview.h_band || 3} of 4`}
                  tone={activePreview.h_band >= 3 ? 'amber' : 'green'}
                />
                <Signal
                  label="Opened At"
                  value={formatTimeAgo(activePreview.opened_at)}
                  tone="slate"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-[#edf1ef] pt-5">
                <button
                  onClick={() => handleIntervene(activePreview)}
                  className="rounded-lg bg-[#174c42] px-3.5 py-2.5 text-[11px] font-bold text-white hover:bg-[#123e39] transition-colors"
                >
                  Start intervention
                </button>
                <button
                  onClick={() => handleOpenCase(activePreview)}
                  className="rounded-lg border border-[#dce6e0] px-3.5 py-2.5 text-[11px] font-bold text-[#557068] hover:bg-[#f8fbf9] transition-colors"
                >
                  View complete record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intervention Modal */}
      {interventionModalOpen && (
        <InterventionModal
          isOpen={interventionModalOpen}
          close={() => setInterventionModalOpen(false)}
          currentCase={selectedCaseForModal || activePreview}
        />
      )}
    </>
  );
}
