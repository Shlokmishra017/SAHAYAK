import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoModeBanner } from '../common/DemoModeBanner';
import { useAppState } from '../../context/AppStateContext';
import { Wifi, WifiOff, CloudOff, Cloud, RotateCw } from 'lucide-react';

export function AppShell() {
  const { welfareCases, notification, backendError, isOnline, escalationOutbox, syncOutbox, setIsAirplaneMode, isAirplaneMode } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const pendingCount = (escalationOutbox || []).length;

  const handleToggleOffline = () => {
    setIsAirplaneMode(!isAirplaneMode);
  };

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
              
              {/* Offline/Online Status with Demo Toggle (Task 12) */}
              <div className="rounded-xl border border-[#d2e8db] bg-gradient-to-r from-[#eaf5ef] to-[#f2f8f4] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isOnline && !isAirplaneMode ? (
                      <>
                        <Wifi size={14} className="text-[#286c58]" />
                        <span className="font-semibold text-[#25443b]">
                          🟢 Secure Sync Active — Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={14} className="text-[#c5793e]" />
                        <span className="font-semibold text-[#824f25]">
                          🟠 Field Mode (Offline) — Check-ins saved securely on device
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleOffline}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        isAirplaneMode
                          ? 'border-[#f7d6cd] bg-[#fae6e0] text-[#a55342]'
                          : 'border-[#d2e8db] bg-white text-[#286c58] hover:bg-[#f8fbf9]'
                      }`}
                      title={isAirplaneMode ? 'Go online (demo)' : 'Simulate offline (demo)'}
                    >
                      {isAirplaneMode ? <CloudOff size={13} /> : <Cloud size={13} />}
                      <span>{isAirplaneMode ? 'Go Online' : 'Simulate Offline'}</span>
                    </button>
                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={syncOutbox}
                        className="rounded-lg border border-[#d2e8db] bg-white px-3 py-1.5 text-[11px] font-bold text-[#286c58] hover:bg-[#f8fbf9]"
                      >
                        <RotateCw size={12} className="inline mr-1" />
                        Sync Now ({pendingCount})
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-[#557068]">
                  {isAirplaneMode 
                    ? 'Demo: Simulating field conditions. All check-ins and escalations stored locally in IndexedDB. Click "Go Online" to sync.'
                    : 'Demo: Toggle "Simulate Offline" to demonstrate field PWA behavior — data persists locally, syncs on reconnect.'}
                </p>
              </div>

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
