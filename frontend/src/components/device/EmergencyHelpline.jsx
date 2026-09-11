import React from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Heart, 
  Activity, 
  Clock, 
  Globe, 
  LifeBuoy 
} from 'lucide-react';

export function EmergencyHelpline() {
  return (
    <div className="space-y-6">
      
      {/* Restrained Emergency Support Card */}
      <div className="p-6 rounded-2xl bg-[#111A2B] border border-rose-500/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Emergency Psychological Support</h2>
              <p className="text-xs text-slate-400">Need immediate confidential assistance? 24/7 National Mental Health Helpline</p>
            </div>
          </div>

          <a
            href="tel:14416"
            className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call 14416 SOS (Toll-Free)</span>
          </a>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Operated directly by the Ministry of Health & Family Welfare, <strong>Tele-MANAS</strong> provides free, confidential 24x7 psychological counseling in 20+ Indian languages for defense personnel and families with zero reporting to unit command channels.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] text-xs">
            <Globe className="w-4 h-4 text-slate-400 mb-1" />
            <strong className="text-white block font-medium">20+ Indian Languages</strong>
            <span className="text-slate-400 text-[11px]">Hindi, Punjabi, Marathi, Tamil, Bengali & more</span>
          </div>

          <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] text-xs">
            <Clock className="w-4 h-4 text-slate-400 mb-1" />
            <strong className="text-white block font-medium">24/7 Immediate Reach</strong>
            <span className="text-slate-400 text-[11px]">Certified clinical counselors on call</span>
          </div>

          <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] text-xs">
            <Heart className="w-4 h-4 text-rose-400 mb-1" />
            <strong className="text-white block font-medium">100% Confidential</strong>
            <span className="text-slate-400 text-[11px]">Protected from administrative records</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Regimental Medical Officer (RMO) Desk */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
              <span>Unit Medical Officer (RMO) Liaison</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Duty Desk</span>
          </div>

          <div className="p-4 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-white">Station Hospital Duty RMO</div>
            <div className="text-slate-300">Regimental Medical Officer • Medical Branch</div>
            <div className="text-[11px] text-slate-400 font-mono">Sector Hospital Intercom Ext. 204</div>
          </div>

          <button
            type="button"
            onClick={() => alert("Connecting to Unit Medical Officer Desk...")}
            className="w-full py-2.5 rounded-xl bg-[#162238] hover:bg-[#1D2D49] border border-[#1E2D4A] text-slate-200 text-xs font-medium transition-colors"
          >
            Connect with RMO Desk
          </button>
        </div>

        {/* Tactical Box Breathing Exercise */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>Instant Grounding (Tactical Box Breathing)</span>
            </h3>
            <span className="text-[10px] text-teal-400 font-mono">Decompression</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2D4A]">
              <span className="text-slate-400 text-[10px] block">1</span>
              <span className="text-slate-200 font-bold">Inhale 4s</span>
            </div>
            <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2D4A]">
              <span className="text-slate-400 text-[10px] block">2</span>
              <span className="text-slate-200 font-bold">Hold 4s</span>
            </div>
            <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2D4A]">
              <span className="text-slate-400 text-[10px] block">3</span>
              <span className="text-slate-200 font-bold">Exhale 4s</span>
            </div>
            <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2D4A]">
              <span className="text-slate-400 text-[10px] block">4</span>
              <span className="text-slate-200 font-bold">Pause 4s</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tactical breathing stabilizes heart rate variability, reduces operational adrenaline surges, and resets focus.
          </p>
        </div>

      </div>

    </div>
  );
}
