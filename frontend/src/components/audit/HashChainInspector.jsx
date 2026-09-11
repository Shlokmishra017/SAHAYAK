import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  Check 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { 
  verifyAuditLedger, 
  simulateAuditTampering, 
  restoreAuditChain 
} from '../../services/api';

export function HashChainInspector() {
  const { auditLogs, showToast, refreshGlobalData } = useAppState();
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTampering, setIsTampering] = useState(false);

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAuditLedger();
      setVerificationResult(res);
      if (res.is_valid) {
        showToast("Cryptographic Audit Verification Passed: All block hashes intact.", "success");
      } else {
        showToast(`Audit Verification Alarm: Broken chain at Block #${res.broken_sequence_block}`, "error");
      }
    } catch (err) {
      showToast("Verification failed.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsTampering(true);
    try {
      const res = await simulateAuditTampering(1);
      setVerificationResult(res.verification_result);
      showToast("Tampering Simulated: Verifier caught broken SHA-256 hash pointer!", "error");
      refreshGlobalData();
    } catch (err) {
      showToast("Tamper simulation failed.", "error");
    } finally {
      setIsTampering(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreAuditChain();
      await runVerification();
      showToast("Ledger restored to clean state.", "success");
      refreshGlobalData();
    } catch (err) {
      showToast("Restore failed.", "error");
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  return (
    <div className="space-y-5 text-xs">
      
      {/* Verification Status Banner */}
      <div className={`p-5 rounded-2xl border transition-colors ${
        verificationResult?.is_valid 
          ? 'bg-[#111A2B] border-emerald-500/30' 
          : 'bg-[#111A2B] border-rose-500/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              verificationResult?.is_valid 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {verificationResult?.is_valid ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {verificationResult?.is_valid 
                  ? 'Cryptographic Ledger Integrity: VERIFIED INTACT' 
                  : 'INTEGRITY BREACH DETECTED: Tampered Hash Mismatch!'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {verificationResult?.status_message} (Total Blocks: {auditLogs.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runVerification}
              disabled={isVerifying}
              className="px-3.5 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-[#1E2D4A] text-slate-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Verify Chain</span>
            </button>
            
            {verificationResult?.is_valid ? (
              <button
                onClick={handleSimulateTamper}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Simulate unauthorized SQL modification to verify detector"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Simulate Tamper</span>
              </button>
            ) : (
              <button
                onClick={handleRestore}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Restore Ledger</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Block-by-Block Cryptographic Hash Chain Explorer */}
      <div className="space-y-3">
        <h4 className="font-semibold text-white text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>SHA-256 Append-Only Ledger Explorer</span>
        </h4>

        <div className="space-y-2.5">
          {auditLogs.map((block, idx) => (
            <div
              key={block.seq || idx}
              className={`p-4 rounded-xl border transition-colors ${
                verificationResult?.broken_sequence_block === block.seq
                  ? 'border-rose-500 bg-rose-950/20'
                  : 'border-[#1E2D4A] bg-[#111A2B]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#162238] border border-[#1E2D4A] text-amber-300 font-mono font-bold text-[11px]">
                    Block #{block.seq}
                  </span>
                  <span className="font-semibold text-white uppercase text-xs">
                    {block.action}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span>Actor: <strong className="text-slate-300">{block.actor_role}</strong> ({block.actor_id_hash})</span>
                  <span>• {new Date(block.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Cryptographic Hashes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono mb-2">
                <div className="p-2 bg-[#0B1220] rounded-lg border border-[#1E2D4A] truncate">
                  <span className="text-slate-500 block">Previous Hash (prev_hash):</span>
                  <span className="text-slate-400">{block.prev_hash}</span>
                </div>
                <div className="p-2 bg-[#0B1220] rounded-lg border border-[#1E2D4A] truncate">
                  <span className="text-emerald-400 block font-medium">Block Hash (SHA-256):</span>
                  <span className="text-emerald-300 font-semibold">{block.block_hash}</span>
                </div>
              </div>

              {/* Metadata */}
              {block.metadata && Object.keys(block.metadata).length > 0 && (
                <div className="p-2 bg-[#0B1220] rounded-lg text-[10px] text-slate-400 font-mono">
                  <span>Metadata: </span>
                  <span className="text-slate-300">{JSON.stringify(block.metadata)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
