import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoModeBanner } from '../common/DemoModeBanner';
import { useAppState } from '../../context/AppStateContext';

export function AppShell() {
  const { welfareCases, notification, backendError, isOnline, escalationOutbox, syncOutbox } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const pendingCount = (escalationOutbox || []).length;

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#15221f]">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg flex items-center gap-2 animate-fade-in ${
            notification.type === 'error'
              ? 'bg-[#fae6e0] border-[#f7d6cd] text-[#a55342]'
              : notification.type === 'success'
              ? 'bg-[#eaf5ef] border-[#d1e7da] text-[#286c58]'
              : 'bg-white border-[#dfe8e3] text-[#15221f]'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex min-h-screen">
        <Sidebar casesCount={welfareCases?.length || 0} />

        <section className="min-w-0 flex-1">
          <Header onSearch={setSearchQuery} searchQuery={searchQuery} />

          <div className="mx-auto max-w-[1420px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="mb-4 space-y-3">
              <DemoModeBanner />
              {!isOnline && (
                <div className="rounded-xl border border-[#dfe8e3] bg-white px-4 py-2.5 text-xs font-semibold text-[#557068]">
                  You are offline — check-ins save on this device and queued entries sync on reconnect.
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#d2e8db] bg-[#eaf5ef] px-4 py-2.5 text-xs font-semibold text-[#286c58]">
                  <span>{pendingCount} offline entr{pendingCount > 1 ? 'ies' : 'y'} saved locally, awaiting sync.</span>
                  <button
                    type="button"
                    onClick={syncOutbox}
                    className="rounded-lg border border-[#d2e8db] bg-white px-3 py-1 text-[11px] font-bold text-[#286c58] hover:bg-[#f8fbf9]"
                  >
                    Sync now
                  </button>
                </div>
              )}
              {backendError && (
                <div className="rounded-xl border border-[#f7d6cd] bg-[#fae6e0] px-4 py-2.5 text-xs font-semibold text-[#a55342]">
                  Backend unavailable — {backendError} Your action has not been submitted. Please reconnect and retry.
                </div>
              )}
            </div>
            <Outlet context={{ searchQuery }} />
          </div>
        </section>
      </div>
    </main>
  );
}
