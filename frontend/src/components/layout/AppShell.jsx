import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppState } from '../../context/AppStateContext';

export function AppShell() {
  const { welfareCases, notification } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#15221f]">
      {/* Toast Notification */}
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
            <Outlet context={{ searchQuery }} />
          </div>
        </section>
      </div>
    </main>
  );
}
