import React from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { isDemoMode } from '../../services/api';

export function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">
      <AlertTriangle size={15} className="shrink-0" />
      <span>
        DEMO DATA — Simulated environment for demonstration only. Not operational data.
      </span>
    </div>
  );
}

export function BackendErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[#f7d6cd] bg-[#fae6e0] p-6 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white text-[#a55342]">
        <WifiOff size={20} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-[#843627]">Backend unavailable</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#a55342]">
        {message || 'Your action has not been submitted. Please reconnect and retry.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl border border-[#f7d6cd] bg-white px-4 py-2 text-xs font-bold text-[#a55342] hover:bg-white/70"
        >
          Retry
        </button>
      )}
    </div>
  );
}
