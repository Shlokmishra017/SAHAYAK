import React, { useState } from 'react';
import { ShieldAlert, Key, Lock, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { executeBreakGlass } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function BreakGlassModal({ isOpen, onClose, caseItem, onDeAnonymized }) {
  const { showToast } = useAppState();
  
  // Custodian 1 (Welfare Officer)
  const [c1Id, setC1Id] = useState('WO_7742');
  const [c1Pin, setC1Pin] = useState('9481');
  
  // Custodian 2 (Medical Officer / Adjutant)
  const [c2Id, setC2Id] = useState('MO_3109');
  const [c2Pin, setC2Pin] = useState('6205');
  
  const [justification, setJustification] = useState('Life-safety critical assessment requiring medical escort and urgent hospital liaison.');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resolvedProfile, setResolvedProfile] = useState(null);

  if (!isOpen || !caseItem) return null;

  const handleAuthorize = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await executeBreakGlass({
        case_id: caseItem.case_id,
        pseudonym_id: caseItem.pseudonym_id,
        custodian_1_role: 'welfare_officer',
        custodian_1_id: c1Id,
        custodian_1_pin: c1Pin,
        custodian_2_role: 'medical_officer',
        custodian_2_id: c2Id,
        custodian_2_pin: c2Pin,
        justification
      });

      setResolvedProfile(res.identity);
      showToast("Dual-Custodian Break-Glass Authorized: Permanent audit block written.", "success");
      if (onDeAnonymized) onDeAnonymized(res.identity);
    } catch (err) {
      setErrorMsg(err.message || 'Dual authorization failed. Check officer PINs.');
      showToast("Break-Glass Rejected: Dual authorization mismatch.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 p-6 bg-[#111A2B] shadow-modal relative overflow-hidden text-xs">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#162238] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Dual-Custodian Break-Glass Protocol</h3>
            <p className="text-xs text-slate-400">Zero-Trust Isolation Barrier: Z1 Welfare Core ↔ Z2 Identity Broker</p>
          </div>
        </div>

        {!resolvedProfile ? (
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs text-rose-200 leading-relaxed">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
              <strong>Warning:</strong> Re-identification requires <strong>two independent officer signatures</strong>. 
              No single administrator can reveal personnel identities. This action produces an immutable audit record.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Custodian 1 */}
              <div className="p-3.5 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Signer 1: Welfare Officer</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Officer ID</label>
                    <input 
                      type="text" 
                      value={c1Id} 
                      onChange={e => setC1Id(e.target.value)}
                      className="w-full bg-[#111A2B] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">PIN (Demo: 9481)</label>
                    <input 
                      type="password" 
                      value={c1Pin} 
                      onChange={e => setC1Pin(e.target.value)}
                      className="w-full bg-[#111A2B] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white tracking-widest" 
                    />
                  </div>
                </div>
              </div>

              {/* Custodian 2 */}
              <div className="p-3.5 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Signer 2: Medical Officer</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Medical Officer ID</label>
                    <input 
                      type="text" 
                      value={c2Id} 
                      onChange={e => setC2Id(e.target.value)}
                      className="w-full bg-[#111A2B] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">PIN (Demo: 6205)</label>
                    <input 
                      type="password" 
                      value={c2Pin} 
                      onChange={e => setC2Pin(e.target.value)}
                      className="w-full bg-[#111A2B] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white tracking-widest" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-300 mb-1 block">Clinical / Operational Justification (Logged Permanently)</label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={2}
                className="w-full bg-[#0B1220] border border-[#1E2D4A] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-[#162238] rounded-lg border border-[#1E2D4A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? 'Verifying Dual Custody...' : 'Authorize Break-Glass'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-emerald-200">Identity De-Anonymized & Medical Alert Dispatched</h4>
                <p className="text-[11px] text-slate-400">Audit block written to append-only chain.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-[#0B1220] border border-[#1E2D4A] rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Full Name & Rank:</span>
                <span className="text-white font-bold">{resolvedProfile.rank} {resolvedProfile.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Service Number:</span>
                <span className="text-amber-400 font-mono font-semibold">{resolvedProfile.service_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Assigned Unit:</span>
                <span className="text-slate-200">{resolvedProfile.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Blood Group:</span>
                <span className="text-rose-300 font-semibold">{resolvedProfile.blood_group}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Emergency Contact:</span>
                <span className="text-slate-200">{resolvedProfile.emergency_contact_name} ({resolvedProfile.emergency_contact_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Base Station:</span>
                <span className="text-slate-200">{resolvedProfile.base_location}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-[#162238] hover:bg-[#1D2D49] rounded-lg border border-[#1E2D4A]"
              >
                Close & Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
