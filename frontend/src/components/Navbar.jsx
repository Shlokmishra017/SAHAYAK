import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Heart, 
  UserCheck, 
  BarChart3, 
  Lock, 
  Plane, 
  LogOut, 
  ChevronDown, 
  User,
  Shield,
  Key
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

export function Navbar() {
  const { 
    currentUser, 
    logout, 
    activeRole, 
    isAirplaneMode, 
    setIsAirplaneMode, 
    notification 
  } = useAppState();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Role metadata for the authorized user
  const roleDisplayMap = {
    device: { label: 'Personnel Wellness Portal', icon: Heart, badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
    welfare: { label: 'Welfare Officer Triage Core', icon: UserCheck, badgeColor: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
    command: { label: 'Commander Macro Strategy', icon: BarChart3, badgeColor: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40' },
    audit: { label: 'Auditor & Trust Compliance Proof', icon: Lock, badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' }
  };

  const currentDisplay = roleDisplayMap[activeRole] || roleDisplayMap.device;
  const RoleIcon = currentDisplay.icon;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060b17]/90 backdrop-blur-xl">
      {/* System Toast Notification */}
      {notification && (
        <div className={`w-full py-1.5 px-4 text-xs text-center font-medium transition-all duration-300 ${
          notification.type === 'error' ? 'bg-rose-600/90 text-white' :
          notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-sans">SAHAYAK</h1>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  AI WELFARE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Personnel Stress & Welfare Intelligence</p>
            </div>
          </div>

          {/* Active Authorized Level Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-xs">
            <RoleIcon className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-semibold hidden md:inline">Authorized Domain:</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${currentDisplay.badgeColor}`}>
              {currentDisplay.label}
            </span>
          </div>

          {/* Right Section: Airplane Simulator & User Profile Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {activeRole === 'device' && (
              <button
                onClick={() => setIsAirplaneMode(!isAirplaneMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isAirplaneMode 
                    ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 animate-pulse' 
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Airplane Mode to test local on-device execution"
              >
                <Plane className={`w-3.5 h-3.5 ${isAirplaneMode ? 'rotate-45 text-sky-300' : ''}`} />
                <span className="hidden md:inline">{isAirplaneMode ? 'Airplane Mode ON' : 'Airplane Mode OFF'}</span>
              </button>
            )}

            {/* User Profile Chip & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-amber-500/50 transition-all text-xs"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-xs text-white shadow">
                  {currentUser?.avatar || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-white font-bold block leading-tight truncate max-w-[130px]">
                    {currentUser?.name || 'Authenticated User'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {currentUser?.rank || 'Authorized Personnel'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel border border-slate-700 p-3.5 bg-[#0c1527]/95 shadow-2xl space-y-3 z-50 text-xs animate-fade-in">
                  
                  {/* Account Summary */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        Authenticated Identity
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300">{currentUser?.serviceNo}</span>
                    </div>
                    <p className="font-bold text-white text-sm">{currentUser?.rank} {currentUser?.name}</p>
                    <p className="text-[11px] text-slate-400">{currentUser?.unit}</p>
                    
                    <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5 font-mono">
                      <div>Clearance: <strong className="text-emerald-400">{currentUser?.clearance}</strong></div>
                      <div>Access Domain: <strong className="text-slate-300">{currentUser?.level}</strong></div>
                    </div>
                  </div>

                  {/* Sign Out Action */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold hover:bg-rose-500/30 flex items-center justify-center gap-2 transition-all shadow"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out & Terminate Session</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
