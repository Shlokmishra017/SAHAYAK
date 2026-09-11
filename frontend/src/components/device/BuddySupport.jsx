import React, { useState } from 'react';
import { 
  Users, 
  HeartHandshake, 
  Coffee, 
  CheckCircle, 
  Send, 
  UserCheck 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export function BuddySupport() {
  const { showToast } = useAppState();
  const [buddyNudgeSent, setBuddyNudgeSent] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('tea_coffee');

  const handleSendNudge = () => {
    setBuddyNudgeSent(true);
    showToast("Informal buddy check-in ping sent to designated squad companion.", "success");
    setTimeout(() => setBuddyNudgeSent(false), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#162238] rounded-lg text-amber-400">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Tier 1 Peer-First Support Protocol</strong>
            <span className="text-slate-400">Informal check-in with your designated squad companion. Resolves early operational stress before official welfare intervention.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A] font-mono text-[11px] text-slate-300 self-start sm:self-auto">
          Non-HR Informal
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Buddy Profile Card */}
        <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Designated Squad Buddy</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active on Base
            </span>
          </div>

          <div className="p-4 bg-[#0B1220] border border-[#1E2D4A] rounded-xl flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#162238] border border-[#1E2D4A] flex items-center justify-center font-bold text-sm text-amber-400 shrink-0">
              HK
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Havildar Kuldeep Singh</h4>
              <p className="text-xs text-slate-400">Section 2 Companion • CRPF 144 Bn</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Barrack Block B-4, Sector HQ</p>
            </div>
          </div>

          <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A] text-xs text-slate-400 space-y-1">
            <strong className="text-slate-300 block font-medium">How buddy check-ins work:</strong>
            <p className="text-[11px] leading-relaxed">
              Your buddy receives a quiet prompt to catch up. Your private check-in ratings and journals remain 100% confidential.
            </p>
          </div>
        </div>

        {/* Action Panel: Send Informal Nudge */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
          <div className="border-b border-[#1E2D4A] pb-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Send an Informal Connect Request</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose a relaxed prompt to connect over tea or walk</p>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'tea_coffee', title: 'Chai & Conversation', text: "Let's catch up over chai at the mess this evening after roll call." },
              { id: 'walk', title: 'Walk Around Perimeter', text: "Free for a 15-minute walk around the parade ground before lights out?" },
              { id: 'support', title: 'Quiet Catch-Up', text: "Need someone to talk through some personal or duty matters confidentially." }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedTopic(opt.id)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  selectedTopic === opt.id
                    ? 'bg-[#162238] border-amber-500/50 text-slate-100'
                    : 'bg-[#0B1220] border-[#1E2D4A] text-slate-300 hover:bg-[#162238]/60'
                }`}
              >
                <div>
                  <span className="font-semibold text-xs text-white block">{opt.title}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{opt.text}</span>
                </div>
                {selectedTopic === opt.id && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 ml-3" />}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSendNudge}
              disabled={buddyNudgeSent}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {buddyNudgeSent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-slate-900" />
                  <span>Nudge Dispatched!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>Send Peer Check-In</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
