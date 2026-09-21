import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { executeBreakGlass, fetchCustodiansInfo } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function BreakGlassModal({ isOpen, onClose, caseItem, onDeAnonymized }) {
  const { showToast } = useAppState();

  const [custodians, setCustodians] = useState([]);
  const [c1Id, setC1Id] = useState('WO_7742');
  const [c1Pin, setC1Pin] = useState('9481');
  const [c2Role, setC2Role] = useState('medical_officer');
  const [c2Id, setC2Id] = useState('MO_3109');
  const [c2Pin, setC2Pin] = useState('6205');
  const [justification, setJustification] = useState('Acute distress signal observed. Immediate clinical welfare intervention and medical assessment required.');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resolvedProfile, setResolvedProfile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCustodiansInfo().then((res) => {
        if (res?.authorized_custodians_demo) {
          setCustodians(res.authorized_custodians_demo);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

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
        custodian_2_role: c2Role,
        custodian_2_id: c2Id,
        custodian_2_pin: c2Pin,
        justification
      });

      setResolvedProfile(res.identity);
      showToast('Dual-custodian authorization approved. Identity resolved.', 'success');
      if (onDeAnonymized) onDeAnonymized(res.identity);
    } catch (err) {
      setErrorMsg(err.message || 'Dual authorization failed. Please check credentials and PINs.');
      showToast('Authorization denied', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Dual-Custodian Break-Glass Protocol</h3>
              <p className="text-xs text-slate-500">Emergency identity de-anonymization for life-safety interventions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!resolvedProfile ? (
          <form onSubmit={handleAuthorize} className="space-y-4 pt-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Strict Statutory Compliance:</strong> In accordance with CAPF welfare protocols and the DPDP Act, revealing real service identity requires concurrent cryptographic PINs from two distinct authorized officers. Every attempt is permanently logged into the SHA-256 audit ledger.
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Case Identifier: <span className="font-mono text-slate-800 lowercase">{caseItem.case_id}</span> ({caseItem.pseudonym_id ? caseItem.pseudonym_id.slice(0, 8) : ''}...)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custodian 1 */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    Custodian 1: Welfare Officer
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Officer Service ID</label>
                    <input
                      type="text"
                      value={c1Id}
                      onChange={(e) => setC1Id(e.target.value)}
                      className="w-full text-xs font-mono px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Authorization PIN</label>
                    <input
                      type="password"
                      value={c1Pin}
                      onChange={(e) => setC1Pin(e.target.value)}
                      className="w-full text-xs font-mono tracking-widest px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                      required
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">Demo PIN: 9481 (Capt. Meera Nair)</div>
                </div>

                {/* Custodian 2 */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                      Custodian 2: Secondary Officer
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Role & Service ID</label>
                    <div className="flex gap-1.5">
                      <select
                        value={c2Role}
                        onChange={(e) => {
                          setC2Role(e.target.value);
                          if (e.target.value === 'medical_officer') {
                            setC2Id('MO_3109');
                            setC2Pin('6205');
                          } else {
                            setC2Id('ADJ_102');
                            setC2Pin('8821');
                          }
                        }}
                        className="text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                      >
                        <option value="medical_officer">Medical Officer</option>
                        <option value="adjutant">Adjutant</option>
                      </select>
                      <input
                        type="text"
                        value={c2Id}
                        onChange={(e) => setC2Id(e.target.value)}
                        className="flex-1 text-xs font-mono px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Authorization PIN</label>
                    <input
                      type="password"
                      value={c2Pin}
                      onChange={(e) => setC2Pin(e.target.value)}
                      className="w-full text-xs font-mono tracking-widest px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                      required
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Demo PIN: {c2Role === 'medical_officer' ? '6205 (Dr. Arvind Rao)' : '8821 (Lt. Col. Gill)'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Mandatory Operational / Medical Justification
              </label>
              <textarea
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="State the emergency reason requiring de-anonymization..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isLoading ? 'Verifying Dual Custody...' : 'Execute Break-Glass'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2.5 text-emerald-900">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">Dual-Custodian Authorization Verified</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Identity de-anonymized. Event permanently recorded in the SHA-256 audit ledger with actor hashes.
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Personnel Name & Rank</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {resolvedProfile.rank} {resolvedProfile.full_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Force Reg. Number</div>
                  <div className="text-xs font-mono font-medium text-slate-900 mt-0.5">
                    {resolvedProfile.service_number}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Battalion Unit</span>
                  <span className="text-slate-800 font-medium">{resolvedProfile.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Blood Group</span>
                  <span className="text-slate-800 font-medium">{resolvedProfile.blood_group || 'Not recorded'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Base Location</span>
                  <span className="text-slate-800 font-medium">{resolvedProfile.base_location || 'Sector HQ'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Emergency Contact</span>
                  <span className="text-slate-800 font-medium">
                    {resolvedProfile.emergency_contact_name} ({resolvedProfile.emergency_contact_phone})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
