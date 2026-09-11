import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  Key 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { requestDataPurge } from '../../services/api';

export function ConsentAndErasure() {
  const { pseudonymId, showToast } = useAppState();
  const [isPurging, setIsPurging] = useState(false);
  const [purgedSuccess, setPurgedSuccess] = useState(false);

  const handleEraseAll = async () => {
    if (!window.confirm("Are you sure you want to permanently erase all local check-in records and server escalation flags under DPDP Act?")) {
      return;
    }

    setIsPurging(true);
    try {
      await requestDataPurge(pseudonymId);
      setPurgedSuccess(true);
      showToast("DPDP Purge Completed: All local records and server links cleared.", "success");
    } catch (err) {
      showToast("Purge failed. Try again.", "error");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#162238] rounded-lg text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Digital Personal Data Protection (DPDP Act 2023) Compliance</strong>
            <span className="text-slate-400">You retain statutory rights to purpose limitation, access control, and complete erasure of personal wellness records.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A] font-mono text-[11px] text-slate-300 self-start sm:self-auto">
          DPDP 2023 Enforced
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Privacy Rights (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            <div className="border-b border-[#1E2D4A] pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Statutory Welfare Protection Invariants</span>
              </h3>
              <p className="text-xs text-slate-400">Architectural guarantees separating welfare care from disciplinary HR</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <strong className="text-white font-semibold block">1. Air-Gapped from APAR</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Welfare records are strictly isolated. Risk indices are barred from export to Annual Performance Appraisals or promotional rosters.
                </p>
              </div>

              <div className="p-4 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <strong className="text-white font-semibold block">2. On-Device Local Storage</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Personal voice recordings and raw continuous rating slopes remain stored exclusively on your device.
                </p>
              </div>

              <div className="p-4 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <strong className="text-white font-semibold block">3. Pseudonymized Identification</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The central system only sees an irreversible UUID pseudonym. Your real identity is protected behind the Identity Broker.
                </p>
              </div>

              <div className="p-4 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <strong className="text-white font-semibold block">4. Voluntary Participation</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Daily self-assessments are voluntary. Opting out records zero disciplinary penalty or career consequence.
                </p>
              </div>
            </div>
          </div>

          {/* Device Pseudonym Info */}
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Dynamic Pseudonym Identifier</span>
            </h4>
            <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <span className="text-amber-400 font-medium truncate">{pseudonymId}</span>
              <span className="text-slate-500 text-[10px] shrink-0">Z2 Identity Broker Protected</span>
            </div>
          </div>
        </div>

        {/* Right Col: 1-Tap Data Purge */}
        <div>
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs border-b border-[#1E2D4A] pb-3">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Right to Erasure (DPDP Act)</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Exercise your legal right to complete data erasure. This will permanently clear all local records and purge associated server flags.
            </p>

            <button
              type="button"
              onClick={handleEraseAll}
              disabled={isPurging}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 active:bg-rose-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPurging ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-rose-400" />
              )}
              <span>{isPurging ? 'Purging Enclave...' : '1-Tap "Erase My Data"'}</span>
            </button>

            {purgedSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl text-center flex items-center justify-center gap-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>All local logs and server flags permanently erased.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
