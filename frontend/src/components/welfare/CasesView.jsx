import React, { useState, useMemo } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageIntro } from '../layout/PageIntro';
import {
  Avatar,
  Risk,
  getCaseInitials,
  getCasePseudonymName,
  getCaseTone,
  getRiskLabel,
  getPrimarySignal,
  formatTimeAgo
} from './caseHelpers';
import { InterventionModal } from '../interventions/InterventionModal';
import { useAppState } from '../../context/AppStateContext';

export function CasesView() {
  const { welfareCases, refreshGlobalData } = useAppState();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [selectedCaseForModal, setSelectedCaseForModal] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshGlobalData();
    setIsRefreshing(false);
  };

  const filtered = useMemo(() => {
    return (welfareCases || []).filter((item) => {
      if (severityFilter !== 'all' && item.tier !== severityFilter) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const id = (item.case_id || '').toLowerCase();
        const unit = (item.unit_context || '').toLowerCase();
        const sig = getPrimarySignal(item.reason_codes).toLowerCase();
        const name = getCasePseudonymName(item).toLowerCase();
        if (!id.includes(q) && !unit.includes(q) && !sig.includes(q) && !name.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [welfareCases, severityFilter, query]);

  const handleRowClick = (item) => {
    if (item?.case_id) {
      navigate(`/welfare/cases/${item.case_id}`);
    }
  };

  const handleNewIntervention = () => {
    setSelectedCaseForModal(welfareCases?.[0] || null);
    setInterventionModalOpen(true);
  };

  return (
    <>
      <PageIntro
        title="Cases"
        description="A complete queue of welfare cases requiring care and follow-up."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-[#dfe8e3] bg-white text-[#557068] hover:bg-[#f8fbf9] transition-colors"
              title="Refresh queue"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleNewIntervention}
              className="flex items-center gap-2 rounded-xl bg-[#174c42] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#123e39] transition-colors"
            >
              <Plus size={15} /> Log intervention
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        {/* Filter bar & Search */}
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#80918b]">
              All cases <span className="rounded-md bg-[#eaf3ed] px-1.5 py-0.5 text-[#397c68]">{filtered.length}</span>
            </div>

            {/* Severity Tabs */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg bg-[#f0f5f2] p-0.5 text-xs">
              {['all', 'critical', 'elevated', 'emerging'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                    severityFilter === sev
                      ? 'bg-white text-[#174c42] shadow-xs'
                      : 'text-[#6c7d78] hover:text-[#174c42]'
                  }`}
                >
                  {sev === 'all' ? 'All tiers' : sev}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#e0e8e4] px-3 py-2 bg-white">
            <Search size={14} className="text-[#95a39d]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cases, unit, signal..."
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#a2afa9]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f8fbf9] text-[10px] uppercase tracking-[0.12em] text-[#8a9a94]">
              <tr>
                <th className="px-5 py-3.5 font-bold">Case / person</th>
                <th className="px-5 py-3.5 font-bold">Unit context</th>
                <th className="px-5 py-3.5 font-bold">Severity</th>
                <th className="px-5 py-3.5 font-bold">Welfare signal</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#8a9a94]">
                    No cases match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.case_id}
                    onClick={() => handleRowClick(item)}
                    className="cursor-pointer transition-colors hover:bg-[#f8fbf9]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={getCaseInitials(item)}
                          tone={getCaseTone(item.tier)}
                        />
                        <div>
                          <div className="text-[13px] font-semibold text-[#2d453e]">
                            {getCasePseudonymName(item)}
                          </div>
                          <div className="text-[10px] text-[#99a6a0] font-mono">{item.case_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-[#70827b]">
                      {item.unit_context || 'CRPF 144 Bn (CI Ops)'}
                    </td>
                    <td className="px-5 py-4">
                      <Risk value={getRiskLabel(item.tier)} />
                    </td>
                    <td className="px-5 py-4 text-[11px] text-[#70827b]">
                      <div className="font-medium text-[#2d453e]">{getPrimarySignal(item.reason_codes)}</div>
                      {item.has_acute_marker && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-[#a55342]">
                          ⚠️ Acute distress marker
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-semibold">
                      <span
                        className={
                          item.status === 'open'
                            ? 'text-[#bc684f]'
                            : item.status === 'intervention_active'
                            ? 'text-[#286c58]'
                            : 'text-[#397c68]'
                        }
                      >
                        {item.status ? item.status.replace(/_/g, ' ') : 'open'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-[#99a6a0]">
                      {formatTimeAgo(item.opened_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intervention Modal */}
      {interventionModalOpen && (
        <InterventionModal
          isOpen={interventionModalOpen}
          close={() => setInterventionModalOpen(false)}
          currentCase={selectedCaseForModal}
        />
      )}
    </>
  );
}
