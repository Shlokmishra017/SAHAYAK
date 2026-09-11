import React, { useState } from 'react';
import { 
  Smile, 
  Meh, 
  Frown, 
  Moon, 
  Zap, 
  ShieldCheck, 
  Check, 
  Heart,
  Lock
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export function DailyCheckIn() {
  const { addCheckIn } = useAppState();
  const [mood, setMood] = useState(3);
  const [sleepHours, setSleepHours] = useState(5.5);
  const [fatigue, setFatigue] = useState(3);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const moodOptions = [
    { val: 1, label: 'Very Low', sub: 'Severe stress', icon: Frown },
    { val: 2, label: 'Low', sub: 'Fatigued / Low energy', icon: Frown },
    { val: 3, label: 'Moderate', sub: 'Nominal coping', icon: Meh },
    { val: 4, label: 'Good', sub: 'Resilient / Stable', icon: Smile },
    { val: 5, label: 'Very Good', sub: 'High energy & morale', icon: Heart },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    addCheckIn(mood, sleepHours, fatigue);
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* PRIMARY CARD: Mood & Morale Assessment */}
      <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2D4A] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-400" />
              <span>How are you feeling today?</span>
            </h2>
            <p className="text-xs text-slate-400">Daily voluntary morale self-assessment</p>
          </div>
          <span className="text-xs font-mono text-amber-300 font-medium px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A]">
            Selected: {moodOptions.find(m => m.val === mood)?.label}
          </span>
        </div>

        {/* 5 Mood States (Clean, restrained, clear selected state without glowing) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {moodOptions.map((item) => {
            const Icon = item.icon;
            const isSelected = mood === item.val;
            return (
              <button
                type="button"
                key={item.val}
                onClick={() => setMood(item.val)}
                className={`
                  p-4 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center transition-colors border
                  ${isSelected 
                    ? 'bg-[#162238] border-amber-500/60 text-white font-medium' 
                    : 'bg-[#0B1220] border-[#1E2D4A] text-slate-400 hover:text-slate-200 hover:bg-[#162238]/40'}
                `}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/15 text-amber-400' : 'bg-[#111A2B] text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-slate-100">{item.label}</span>
                  <span className="text-[10px] text-slate-400 block">{item.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECONDARY CARDS: Sleep, Duty Fatigue, and Submission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Sleep Card */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <div>
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-slate-400" />
                <span>Sleep Duration</span>
              </h3>
              <p className="text-[11px] text-slate-400">Past 24 hours</p>
            </div>
            <span className="font-mono text-sm font-bold text-white px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A]">
              {sleepHours} hrs
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <input
              type="range"
              min="2.0"
              max="10.0"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-[#0B1220] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>2.0h</span>
              <span className="text-slate-300">7.0h (Optimal)</span>
              <span>10.0h</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0B1220] border border-[#1E2D4A] text-[11px] text-slate-400">
            {sleepHours < 5 ? (
              <span className="text-amber-300">Sleep window is below standard operational rest.</span>
            ) : (
              <span className="text-slate-300">Healthy rest duration maintained.</span>
            )}
          </div>
        </div>

        {/* Duty Fatigue Card */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <div>
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span>Duty Fatigue</span>
              </h3>
              <p className="text-[11px] text-slate-400">Perceived physical fatigue</p>
            </div>
            <span className="font-mono text-sm font-bold text-white px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A]">
              {fatigue} / 5
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setFatigue(lvl)}
                  className={`py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                    fatigue === lvl
                      ? 'bg-[#162238] text-amber-300 border-amber-500/50'
                      : 'bg-[#0B1220] text-slate-400 border-[#1E2D4A] hover:bg-[#162238]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0B1220] border border-[#1E2D4A] text-[11px] text-slate-400">
            {fatigue <= 2 ? 'Fresh / nominal' : fatigue === 3 ? 'Moderate fatigue' : 'High fatigue accumulated'}
          </div>
        </div>

        {/* Submission Card */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 border-b border-[#1E2D4A] pb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>On-Device Security Enclave</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Submitting updates your local 7-day personal trajectory without uploading any raw response data to central servers.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitted ? (
              <>
                <Check className="w-4 h-4 text-slate-900" />
                <span>Saved to On-Device Enclave</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-slate-900" />
                <span>Save Daily Check-in</span>
              </>
            )}
          </button>
        </div>

      </div>

    </form>
  );
}
