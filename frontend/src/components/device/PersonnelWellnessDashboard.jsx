import React, { useState, useEffect } from 'react';
import { 
  Smile, 
  Mic, 
  BarChart2, 
  Users, 
  PhoneCall, 
  ShieldCheck, 
  Lock, 
  Moon, 
  Zap, 
  Heart,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { StatusBadge } from '../common/CommonUI';
import { DailyCheckIn } from './DailyCheckIn';
import { VoiceJournal } from './VoiceJournal';
import { LocalAnalytics } from './LocalAnalytics';
import { BuddySupport } from './BuddySupport';
import { EmergencyHelpline } from './EmergencyHelpline';
import { ConsentAndErasure } from './ConsentAndErasure';

export function PersonnelWellnessDashboard({ externalSection }) {
  const { 
    currentUser, 
    localFusionResult, 
    checkIns 
  } = useAppState();

  const [activeTab, setActiveTab] = useState(externalSection || 'checkin');

  useEffect(() => {
    if (externalSection && externalSection !== 'overview') {
      setActiveTab(externalSection);
    } else if (externalSection === 'overview') {
      setActiveTab('checkin');
    }
  }, [externalSection]);

  const latestCheckIn = checkIns[checkIns.length - 1];

  const tabs = [
    { id: 'checkin', label: 'Daily Check-in', icon: Smile },
    { id: 'analytics', label: 'Trends & Insights', icon: BarChart2 },
    { id: 'journal', label: 'Voice Diary', icon: Mic },
    { id: 'buddy', label: 'Buddy Support', icon: Users },
    { id: 'sos', label: 'Emergency / SOS', icon: PhoneCall },
    { id: 'privacy', label: 'Privacy & DPDP', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      
      {/* Calm Personnel Greeting & Overview Bar */}
      <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Good morning, {currentUser?.name?.split(' ')[0] || 'Personnel'}
              </h1>
              <StatusBadge tier={localFusionResult.tier} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Your wellness check-in is private and secure. All continuous ratings and diary recordings remain in your on-device enclave.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#162238] border border-[#1E2D4A] text-left">
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-medium">Mood Status</span>
              <span className="text-amber-400 font-bold text-sm">
                {latestCheckIn ? `${latestCheckIn.mood} / 5` : '3 / 5'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#162238] border border-[#1E2D4A] text-left">
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-medium">Sleep</span>
              <span className="text-slate-200 font-bold text-sm">
                {latestCheckIn ? `${latestCheckIn.sleepHours} hrs` : '5.5 hrs'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#162238] border border-[#1E2D4A] text-left">
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-medium">Duty Fatigue</span>
              <span className="text-slate-200 font-bold text-sm">
                {latestCheckIn?.fatigue || 3} / 5
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="pt-3 border-t border-[#1E2D4A] flex flex-wrap gap-1.5 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors
                  ${isSel 
                    ? 'bg-[#162238] text-amber-300 border border-amber-500/30 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#162238]/50 border border-transparent'}
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Panel */}
      <div className="w-full">
        {activeTab === 'checkin' && <DailyCheckIn />}
        {activeTab === 'analytics' && <LocalAnalytics />}
        {activeTab === 'journal' && <VoiceJournal />}
        {activeTab === 'buddy' && <BuddySupport />}
        {activeTab === 'sos' && <EmergencyHelpline />}
        {activeTab === 'privacy' && <ConsentAndErasure />}
      </div>

    </div>
  );
}
