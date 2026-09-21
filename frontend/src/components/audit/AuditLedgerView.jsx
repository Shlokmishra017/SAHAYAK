import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { PageIntro } from '../layout/PageIntro';
import {
  fetchAuditLedger,
  verifyAuditLedger,
  simulateAuditTampering,
  restoreAuditChain
} from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function AuditLedgerView() {
  const { showToast } = useAppState();

  const [blocks, setBlocks] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTampering, setIsTampering] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [expandedSeq, setExpandedSeq] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  const loadData = async () => {
    try {
      const [logsRes, verifyRes] = await Promise.all([
        fetchAuditLedger(50),
        verifyAuditLedger()
      ]);
      setBlocks(logsRes?.blocks || []);
      setVerificationResult(verifyRes || null);
    } catch (err) {
      console.error('Failed to load audit data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAuditLedger();
      setVerificationResult(res);
      if (res.is_valid) {
        showToast('All cryptographic ledger blocks verified intact.', 'success');
      } else {
        showToast(`Integrity breach detected at Block #${res.broken_sequence_block}!`, 'error');
      }
    } catch (err) {
      showToast('Audit verification failed.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTamperTest = async () => {
    setIsTampering(true);
    try {
      const res = await simulateAuditTampering(1);
      setVerificationResult(res.verification_result);
      showToast('Tamper simulation executed: Broken hash detected immediately.', 'error');
      const logs = await fetchAuditLedger(50);
      setBlocks(logs?.blocks || []);
    } catch (err) {
      showToast('Tamper test failed.', 'error');
    } finally {
      setIsTampering(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreAuditChain();
      await loadData();
      showToast('Audit chain restored and verified to clean state.', 'success');
    } catch (err) {
      showToast('Failed to restore ledger.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const isValid = verificationResult?.is_valid !== false;

  return (
    <>
      <PageIntro
        eyebrow="Immutable Cryptographic Trust Layer"
        title="Audit ledger"
        description="A transparent record of sensitive access, de-anonymizations, and governance actions."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex items-center gap-2 rounded-xl bg-[#174c42] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#123e39] transition-colors"
            >
              <ShieldCheck size={15} className={isVerifying ? 'animate-spin' : ''} />
              {isVerifying ? 'Verifying...' : 'Verify chain'}
            </button>

            {isValid ? (
              <button
                onClick={handleTamperTest}
                disabled={isTampering}
                className="flex items-center gap-2 rounded-xl border border-[#f7d6cd] bg-[#fae6e0] px-3.5 py-2.5 text-[12px] font-semibold text-[#a55342] hover:bg-[#f3cdc3] transition-colors"
                title="Simulate data tampering to test cryptographic detection"
              >
                <AlertTriangle size={15} />
                {isTampering ? 'Testing...' : 'Simulate tampering'}
              </button>
            ) : (
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 rounded-xl bg-[#286c58] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#1f5444] transition-colors"
              >
                <RefreshCw size={15} className={isRestoring ? 'animate-spin' : ''} />
                {isRestoring ? 'Restoring...' : 'Restore clean chain'}
              </button>
            )}
          </div>
        }
      />

      {/* Verification Status Banner */}
      <div
        className={`mb-6 rounded-2xl border p-5 transition-colors ${
          isValid
            ? 'border-[#d1e7da] bg-[#f1f7f3]'
            : 'border-[#f7d6cd] bg-[#fae6e0]'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                isValid ? 'bg-white text-[#286c58]' : 'bg-white text-[#a55342]'
              }`}
            >
              {isValid ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3
                className={`font-serif text-[18px] font-semibold ${
                  isValid ? 'text-[#214c3f]' : 'text-[#843627]'
                }`}
              >
                {isValid
                  ? 'Cryptographic Hash Chain Verified Intact'
                  : 'Integrity Breach Detected: Tampered Data Found'}
              </h3>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  isValid ? 'text-[#58736a]' : 'text-[#a55342]'
                }`}
              >
                {verificationResult?.status_message ||
                  (isValid
                    ? 'All sequential SHA-256 blocks validated without collision or modification.'
                    : `Block sequence #${verificationResult?.broken_sequence_block} has been modified.`)}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] font-mono font-bold text-[#2d453e]">
              Total Blocks: {blocks.length}
            </div>
            <div className="text-[10px] text-[#788a84]">
              Protocol: SHA-256 Merkle Chain
            </div>
          </div>
        </div>
      </div>

      {/* Blocks List */}
      <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <div className="mb-5 flex items-center justify-between border-b border-[#edf1ef] pb-4">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">
              Cryptographic Audit Blocks
            </h2>
            <p className="text-[11px] text-[#899791]">
              Every sensitive case review, break-glass identity access, and escalation is immutably hashed.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#27705c]">
            {blocks.length} blocks
          </span>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => {
            const isExpanded = expandedSeq === block.seq;

            return (
              <div
                key={block.seq}
                className="rounded-xl border border-[#dfe8e3] bg-[#fbfdfb] p-4 text-xs transition-colors hover:border-[#b5c7c0]"
              >
                <div
                  onClick={() => setExpandedSeq(isExpanded ? null : block.seq)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#eaf5ef] font-mono text-[11px] font-bold text-[#27705c]">
                      #{block.seq}
                    </span>
                    <div>
                      <div className="font-semibold text-[#18342e]">
                        {block.action}
                      </div>
                      <div className="text-[10px] text-[#788a84]">
                        Actor Role: <span className="font-semibold text-[#3b554c]">{block.actor_role}</span>
                        {block.case_id && <span> · Case: {block.case_id}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#9aa6a1] hidden sm:inline">
                      {block.timestamp ? new Date(block.timestamp).toLocaleString() : 'Recent'}
                    </span>
                    {isExpanded ? <ChevronDown size={16} className="text-[#899791]" /> : <ChevronRight size={16} className="text-[#899791]" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#edf1ef] space-y-2 text-[11px] animate-fade-in font-mono">
                    <div>
                      <span className="text-[#8a9a94] block">Actor SHA-256 Hash:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="break-all text-[#2d453e] bg-[#f0f5f2] p-1.5 rounded-lg flex-1">
                          {block.actor_id_hash}
                        </span>
                        <button
                          onClick={() => handleCopy(block.actor_id_hash, `actor-${block.seq}`)}
                          className="p-1 rounded text-[#788a84] hover:text-[#18342e]"
                        >
                          {copiedHash === `actor-${block.seq}` ? <Check size={14} className="text-[#27705c]" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[#8a9a94] block">Previous Block Hash:</span>
                      <div className="break-all text-[#788a84] bg-[#f0f5f2] p-1.5 rounded-lg">
                        {block.prev_hash}
                      </div>
                    </div>

                    <div>
                      <span className="text-[#8a9a94] block">Block Hash:</span>
                      <div className="break-all font-semibold text-[#27705c] bg-[#eaf5ef] p-1.5 rounded-lg">
                        {block.block_hash}
                      </div>
                    </div>

                    {block.metadata && Object.keys(block.metadata).length > 0 && (
                      <div className="pt-1">
                        <span className="text-[#8a9a94] block">Metadata:</span>
                        <pre className="text-[10px] bg-[#f7faf8] p-2 rounded-lg mt-0.5 overflow-x-auto text-[#3b554c]">
                          {JSON.stringify(block.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
