import React from 'react';
import { 
  Activity, 
  Cpu, 
  Send, 
  Lock, 
  FileCode, 
  Moon, 
  Zap, 
  Smile, 
  Info,
  ShieldCheck
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { StatusBadge, ReasonTag } from '../common/CommonUI';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export function LocalAnalytics() {
  const { 
    checkIns, 
    localWScore, 
    hBandInfo, 
    localFusionResult, 
    triggerDeviceEscalation,
    isAirplaneMode,
    lastEgressPayload
  } = useAppState();

  const chartData = checkIns.map((c, i) => ({
    name: `Day ${i + 1}`,
    date: c.date,
    mood: c.mood,
    sleep: c.sleepHours,
    fatigue: c.fatigue || 3
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Architecture Privacy Note */}
      <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#162238] rounded-lg text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Inverted Edge Privacy Architecture</strong>
            <span className="text-slate-400">Your device downloads the unit operational baseline and fuses stress metrics locally. No personal wellness signals leave this device.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A] font-mono text-[11px] text-slate-300 self-start sm:self-auto">
          Z0 Enclave Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Wellness Pattern & Insights */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Chart Card */}
          <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2D4A] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Your recent wellness pattern</span>
                </h3>
                <p className="text-xs text-slate-400">7-day continuous trajectory (mood, sleep, fatigue)</p>
              </div>
              <span className="text-xs font-mono text-slate-400">EWMA α=0.35</span>
            </div>

            {/* Subtle, clean chart without glowing neon */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[1, 10]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#162238', 
                      borderColor: '#1E2D4A', 
                      borderRadius: '10px', 
                      fontSize: '12px',
                      color: '#F8FAFC'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="mood" stroke="#F59E0B" strokeWidth={2.5} name="Mood (1-5)" dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="sleep" stroke="#38BDF8" strokeWidth={2.5} name="Sleep (Hours)" dot={{ r: 3, fill: '#38BDF8' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="fatigue" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" name="Fatigue (1-5)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plain-Language Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Moon className="w-4 h-4 text-sky-400" />
                <span>Sleep Insights</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your average sleep has decreased slightly over the last 7 days (4.7h average vs. 7.0h baseline).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Fatigue & Duty Status</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Duty fatigue appears manageable but operational rest intervals are recommended following long shifts.
              </p>
            </div>
          </div>

          {/* Local Fusion Calculation Panel */}
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                On-Device Fusion Synthesis
              </h4>
              <StatusBadge tier={localFusionResult.tier} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">1. Local w_score</span>
                <span className="text-amber-400 font-bold text-base">{localWScore}</span>
                <span className="text-[10px] text-slate-500 block font-sans">55% weight</span>
              </div>

              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">2. Unit h_band</span>
                <span className="text-slate-200 font-bold text-base">Band {hBandInfo.h_band}</span>
                <span className="text-[10px] text-slate-500 block font-sans">45% weight</span>
              </div>

              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">3. Composite</span>
                <span className="text-white font-bold text-base">{localFusionResult.compositeScore}</span>
                <span className="text-[10px] text-emerald-400 block font-sans font-semibold">Tier: {localFusionResult.tier}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400 block">Unit-level reason codes:</span>
              <div className="flex flex-wrap gap-1.5">
                {hBandInfo.reason_codes.map((code, idx) => (
                  <ReasonTag key={idx} code={code} />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Privacy-Preserving Escalation */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-slate-300" />
                <span>Welfare Escalation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                If support is needed, you can dispatch an encrypted alert to the Unit Welfare Officer.
              </p>
            </div>

            <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] text-xs text-slate-300 space-y-1">
              <strong className="text-slate-100 block font-medium">Privacy Guarantee:</strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Transmits <strong>only</strong> pseudonym ID, tier, and whitelisted reason codes. Zero journal text or continuous scores are sent.
              </p>
            </div>

            <button
              onClick={triggerDeviceEscalation}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-slate-900" />
              <span>{isAirplaneMode ? 'Queue in Offline Outbox' : 'Transmit Privacy Escalation'}</span>
            </button>

            {lastEgressPayload && (
              <div className="p-3 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transmitted Egress Packet:</span>
                </div>
                <pre className="text-slate-400 overflow-x-auto p-2 bg-[#111A2B] rounded-lg">
                  {JSON.stringify(lastEgressPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
