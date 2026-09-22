import React, { useState } from 'react';
import {
  Menu,
  ChevronRight,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Shield
} from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';

export function Header({ onSearch, searchQuery = '' }) {
  const { currentUser, activeRole, logout } = useAppState();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getWorkspaceTitle = () => {
    if (activeRole === 'command') return 'Command strategic';
    if (activeRole === 'audit') return 'Trust audit';
    if (activeRole === 'device') return 'Personnel enclave';
    return 'Welfare command';
  };

  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p.includes('/cases/')) {
      const parts = p.split('/cases/');
      return `Cases / ${parts[1]}`;
    }
    if (p.startsWith('/welfare/cases')) return 'Cases queue';
    if (p.startsWith('/welfare/interventions')) return 'Interventions';
    if (p.startsWith('/welfare')) return 'Overview';
    if (p.startsWith('/command')) return 'Team pulse';
    if (p.startsWith('/audit')) return 'Audit ledger';
    if (p.startsWith('/wellness/support')) return 'Request support';
    if (p.startsWith('/wellness')) return 'Daily check-in';
    if (p.startsWith('/guidance')) return 'Guidance SOP';
    return 'Dashboard';
  };

  const handleSignOut = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="relative flex h-[74px] items-center justify-between border-b border-[#e3eae7] bg-[#fbfcfb] px-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-[#60746e] lg:hidden hover:bg-[#f0f5f2]"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="lg:hidden">
          <span className="font-serif text-lg font-semibold text-[#15221f]">SAHAYAK</span>
        </div>

        <div className="hidden items-center gap-2 text-[12px] text-[#879791] sm:flex">
          <Link to="/" className="hover:text-[#174c42] transition-colors">
            {getWorkspaceTitle()}
          </Link>
          <ChevronRight size={13} />
          <span className="font-medium text-[#304640]">{getBreadcrumb()}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSearch && (
          <div className="hidden rounded-lg border border-[#e0e8e4] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#49635b] sm:flex sm:items-center sm:gap-2">
            <Search size={14} className="text-[#95a39d]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search cases or records..."
              className="w-36 bg-transparent text-[11px] outline-none placeholder:text-[#a2afa9] focus:w-48 transition-all"
            />
          </div>
        )}

        <button
          className="relative rounded-lg p-2 text-[#6c7d78] hover:bg-[#f0f5f2] transition-colors"
          title="Notifications"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#d47a58]" />
        </button>

        <div className="relative border-l border-[#e2e9e6] pl-3">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 rounded-xl p-1 text-left hover:bg-[#f0f5f2] transition-colors"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-[#d5e9df] text-[11px] font-bold text-[#28604e]">
              {currentUser?.avatar || 'SO'}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[11px] font-semibold text-[#15221f]">{currentUser?.name || 'Officer'}</div>
              <div className="text-[10px] text-[#8a9994]">{currentUser?.rank || 'Personnel'}</div>
            </div>
            <ChevronDown size={14} className="text-[#8a9994] hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-[#dfe8e3] bg-white p-3 shadow-xl animate-fade-in">
              <div className="border-b border-[#edf1ef] pb-3 mb-2 px-2">
                <div className="text-xs font-bold text-[#15221f]">{currentUser?.name}</div>
                <div className="text-[10px] text-[#788a84]">{currentUser?.unit}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-[#eaf5ef] px-2 py-0.5 text-[9px] font-bold text-[#27705c]">
                  <Shield size={10} /> {currentUser?.clearance}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[#8ba099]">
                  Signed in as this role. To use another workspace, sign out and sign in again.
                </p>
              </div>

              <div className="mt-1 border-t border-[#edf1ef] pt-2">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#a55342] hover:bg-[#fae6e0] transition-colors"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-4 right-4 top-[66px] z-30 rounded-2xl border border-[#dfe8e3] bg-white p-3 shadow-xl lg:hidden">
          {activeRole === 'welfare' && (
            <>
              <button
                onClick={() => { navigate('/welfare'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                Overview
              </button>
              <button
                onClick={() => { navigate('/welfare/cases'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                Cases
              </button>
              <button
                onClick={() => { navigate('/welfare/interventions'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                Interventions
              </button>
              <button
                onClick={() => { navigate('/welfare/hrms'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                HRMS import
              </button>
            </>
          )}
          {activeRole === 'command' && (
            <button
              onClick={() => { navigate('/command'); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
            >
              Team pulse
            </button>
          )}
          {activeRole === 'audit' && (
            <button
              onClick={() => { navigate('/audit'); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
            >
              Audit ledger
            </button>
          )}
          {activeRole === 'device' && (
            <>
              <button
                onClick={() => { navigate('/wellness'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                Daily check-in
              </button>
              <button
                onClick={() => { navigate('/wellness/support'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
              >
                Request support
              </button>
            </>
          )}
          <button
            onClick={() => { navigate('/guidance'); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#426056] hover:bg-[#f0f5f2]"
          >
            Guidance
          </button>
        </div>
      )}
    </header>
  );
}
