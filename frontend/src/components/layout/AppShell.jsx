import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  Heart, 
  Smile, 
  Mic, 
  BarChart2, 
  Users, 
  PhoneCall, 
  FileText, 
  UserCheck, 
  BarChart3, 
  Activity, 
  EyeOff, 
  KeyRound, 
  Layers, 
  Plane, 
  LogOut, 
  ChevronRight, 
  Menu, 
  X, 
  User, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { useAppState, DEMO_PERSONAS } from '../../context/AppStateContext';

export function AppShell({ activeSection, onSectionChange, children }) {
  const { 
    currentUser, 
    activeRole, 
    setActiveRole, 
    loginAsPersona, 
    logout, 
    isAirplaneMode, 
    setIsAirplaneMode,
    notification
  } = useAppState();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  // Navigation Items per Role
  const roleNavigations = {
    device: [
      { id: 'overview', label: 'Overview', icon: Heart, desc: 'Wellness dashboard' },
      { id: 'checkin', label: 'Daily Check-in', icon: Smile, desc: 'Morale assessment' },
      { id: 'journal', label: 'Voice Diary', icon: Mic, desc: 'Vernacular audio' },
      { id: 'analytics', label: 'Trends & Insights', icon: BarChart2, desc: 'On-device fusion' },
      { id: 'buddy', label: 'Buddy Support', icon: Users, desc: 'Peer assistance' },
      { id: 'sos', label: 'Emergency / SOS', icon: PhoneCall, desc: '14416 Helpline' },
      { id: 'privacy', label: 'Privacy & DPDP', icon: ShieldCheck, desc: 'Statutory rights' },
    ],
    welfare: [
      { id: 'cases', label: 'Active Welfare Cases', icon: UserCheck, desc: 'Triage queue' },
      { id: 'interventions', label: 'Interventions Log', icon: FileText, desc: 'Audit chain' },
      { id: 'feedback', label: 'Weak-Label Feedback', icon: Activity, desc: 'Model calibration' },
    ],
    command: [
      { id: 'heatmap', label: 'Unit Fatigue Heatmap', icon: BarChart3, desc: 'Macro readiness' },
      { id: 'kanon', label: 'k-Anonymity Guard', icon: EyeOff, desc: 'Privacy protection' },
      { id: 'cohesion', label: 'Cohort Anomalies', icon: Activity, desc: 'Climate indicators' },
      { id: 'rotation', label: 'Rotation Advisor', icon: Users, desc: 'Stand-down planning' },
    ],
    audit: [
      { id: 'chain', label: 'SHA-256 Hash Chain', icon: Lock, desc: 'Ledger integrity' },
      { id: 'comparison', label: 'Model Benchmark', icon: Layers, desc: 'Relative thresholds' },
      { id: 'zerotrust', label: 'Zero-Trust Inspector', icon: ShieldCheck, desc: 'Egress contracts' },
    ]
  };

  const navItems = roleNavigations[activeRole] || roleNavigations.device;

  // Header Title metadata
  const getHeaderMeta = () => {
    switch (activeRole) {
      case 'device':
        return {
          title: 'Personnel Confidential Wellness Suite',
          subtitle: 'Confidential self-assessment and psychological resilience intelligence. Raw data stays on-device.'
        };
      case 'welfare':
        return {
          title: 'Unit Welfare Officer Triage Core',
          subtitle: 'Actionable support queue for flagged personnel. Operates on pseudonym IDs and whitelisted reason codes.'
        };
      case 'command':
        return {
          title: 'Commander Strategic Intelligence',
          subtitle: 'Macro operational readiness and fatigue balancing with strict mathematical k-anonymity (n ≥ 20).'
        };
      case 'audit':
        return {
          title: 'Auditor & Cryptographic Trust Portal',
          subtitle: 'Independent verification of append-only audit ledgers, differential privacy, and zero-trust data boundaries.'
        };
      default:
        return {
          title: 'SAHAYAK Platform',
          subtitle: 'Personnel Stress & Welfare Intelligence'
        };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111A2B] border-b border-[#1E2D4A] z-40 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight">SAHAYAK</div>
            <div className="text-[10px] text-slate-400">Personnel Welfare Intelligence</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-[#162238] text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* LEFT SIDEBAR (Desktop + Mobile Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#111A2B] border-r border-[#1E2D4A] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Top Branding */}
        <div className="p-5 border-b border-[#1E2D4A]">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
            Government of India
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">SAHAYAK</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Personnel Stress & Welfare Intelligence</p>
            </div>
          </div>
        </div>

        {/* Section Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Navigation</span>
            <span className="text-amber-400/90 font-mono text-[10px] font-semibold">
              {activeRole.toUpperCase()}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  w-full px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between transition-all text-xs
                  ${isSelected 
                    ? 'bg-[#162238] text-white font-semibold border border-amber-500/30 text-amber-300' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#162238]/60 border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="block leading-tight">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
                  </div>
                </div>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
              </button>
            );
          })}
        </div>

        {/* Bottom User Profile Section & Role Switcher */}
        <div className="p-3 border-t border-[#1E2D4A] space-y-2 bg-[#0E1729]">
          
          {/* Active User Card */}
          <div className="p-3 bg-[#111A2B] rounded-xl border border-[#1E2D4A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 font-medium">{currentUser?.serviceNo}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentUser?.clearance ? 'RBAC Protected' : 'Enclave'}
              </span>
            </div>
            <div className="font-bold text-xs text-white truncate">{currentUser?.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{currentUser?.rank}</div>
            <div className="text-[10px] text-slate-400 truncate">{currentUser?.unit}</div>
          </div>

          {/* Persona / Role Switcher for Seamless Inspection */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-[#1E2D4A] text-[11px] text-slate-300 flex items-center justify-between transition-all"
            >
              <span>Switch Portal View</span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${roleSwitcherOpen ? 'rotate-90' : ''}`} />
            </button>

            {roleSwitcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111A2B] border border-[#1E2D4A] rounded-xl p-1.5 space-y-1 shadow-dropdown z-50">
                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase">Available Portals:</div>
                {DEMO_PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      loginAsPersona(p);
                      setRoleSwitcherOpen(false);
                      // Default section based on role
                      if (p.role === 'device') onSectionChange('overview');
                      else if (p.role === 'welfare') onSectionChange('cases');
                      else if (p.role === 'command') onSectionChange('heatmap');
                      else if (p.role === 'audit') onSectionChange('chain');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                      currentUser?.id === p.id 
                        ? 'bg-amber-500/20 text-amber-300 font-bold' 
                        : 'text-slate-300 hover:bg-[#162238]'
                    }`}
                  >
                    <div>
                      <div className="truncate">{p.name}</div>
                      <div className="text-[9px] text-slate-400">{p.roleLabel}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout Action */}
          <button
            onClick={logout}
            className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* RIGHT MAIN APPLICATION AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0B1220]">
        
        {/* System Toast Notification */}
        {notification && (
          <div className={`w-full py-2 px-4 text-xs text-center font-medium border-b transition-all ${
            notification.type === 'error' ? 'bg-rose-950/80 border-rose-500/40 text-rose-200' :
            notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' : 
            'bg-amber-950/80 border-amber-500/40 text-amber-200'
          }`}>
            {notification.message}
          </div>
        )}

        {/* TOP HEADER */}
        <header className="border-b border-[#1E2D4A] bg-[#111A2B]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Left: Page Title & Operational Purpose */}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">{headerMeta.title}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#162238] border border-[#1E2D4A] text-slate-300">
                  Z{activeRole === 'device' ? '0' : activeRole === 'welfare' ? '1' : activeRole === 'command' ? '1' : '3'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{headerMeta.subtitle}</p>
            </div>

            {/* Right: Security Indicators & Controls */}
            <div className="flex items-center gap-2.5 text-xs font-mono">
              {activeRole === 'device' && (
                <button
                  onClick={() => setIsAirplaneMode(!isAirplaneMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    isAirplaneMode 
                      ? 'bg-sky-500/15 border-sky-400/50 text-sky-300 font-semibold' 
                      : 'bg-[#162238] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
                  }`}
                  title="Simulate offline local on-device operation"
                >
                  <Plane className={`w-3.5 h-3.5 ${isAirplaneMode ? 'rotate-45 text-sky-300' : ''}`} />
                  <span>{isAirplaneMode ? 'Offline Enclave' : 'Connected'}</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162238] border border-[#1E2D4A] text-slate-300 text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeRole === 'device' ? 'On-Device Private' : 'RBAC Guarded'}</span>
              </div>
            </div>

          </div>
        </header>

        {/* MAIN VIEWPORT CONTENT */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* RESTRAINED GOVERNMENT FOOTER */}
        <footer className="border-t border-[#1E2D4A] bg-[#0E1729] py-3.5 px-6 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Raw Psychological Data Stays On-Device
              </span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Appraisal / HR Export
              </span>
            </div>
            <div className="text-slate-400">
              SAHAYAK Defense & CAPF Welfare Intelligence Architecture
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
