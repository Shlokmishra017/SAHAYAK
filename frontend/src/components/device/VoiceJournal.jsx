import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Globe, 
  ShieldCheck, 
  FileText, 
  Volume2, 
  AlertCircle 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export function VoiceJournal() {
  const { addJournalEntry, localJournalEntries } = useAppState();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [inputText, setInputText] = useState('');
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const sampleVoicePresets = [
    {
      lang: 'Hindi',
      title: 'Hindi (Operational Fatigue)',
      text: 'लगातार 65 दिनों से गश्त पर हूँ, छुट्टी फिर से नामंजूर हो गई। बहुत थकान है और रात को नींद नहीं आ रही है।'
    },
    {
      lang: 'Marathi',
      title: 'Marathi (Deployment Isolation)',
      text: 'गेल्या दोन महिन्यांपासून सुट्टी नाही, घरात अडचणी आहेत. खूप त्रास आणि एकटेपणा वाटत आहे, झोप लागत नाही.'
    },
    {
      lang: 'Punjabi',
      title: 'Punjabi (Shift Stress)',
      text: 'ਲਗਾਤਾਰ ਨਾਈਟ ਡਿਊਟੀ ਕਰਕੇ ਬਹੁਤ ਪਰੇਸ਼ਾਨ ਹਾਂ। ਸਿਰ ਦਰਦ ਰਹਿੰਦਾ ਹੈ ਅਤੇ ਦਿਲ ਬਹੁਤ ਭਾਰੀ ਹੈ।'
    },
    {
      lang: 'English',
      title: 'English (Acute Distress Signal)',
      text: 'I feel completely overwhelmed and isolated after returning from leave, I am struggling to cope.'
    }
  ];

  const handleSimulateAudioInput = (preset) => {
    setSelectedLanguage(preset.lang);
    setIsRecording(true);
    setInputText('');
    
    setTimeout(() => {
      setInputText(preset.text);
      setIsRecording(false);
    }, 700);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const analysis = addJournalEntry(inputText, selectedLanguage);
    setLatestAnalysis(analysis);
    setInputText('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#111A2B] border border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#162238] rounded-lg text-amber-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Vernacular Voice & Text Diary (On-Device NLP)</strong>
            <span className="text-slate-400">Speech is transcribed in-memory locally using quantized models. Raw audio and text are never uploaded to the network.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#162238] border border-[#1E2D4A] font-mono text-[11px] text-slate-300 self-start sm:self-auto">
          Local INT8 Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recording Studio & Language Selector */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-6 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-4">
            
            {/* Language Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2D4A] pb-3">
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select Regional Language</span>
                </h3>
                <p className="text-[11px] text-slate-400">Local vernacular speech recognition</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['Hindi', 'Marathi', 'Punjabi', 'English'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedLanguage === lang
                        ? 'bg-[#162238] text-amber-300 border-amber-500/50'
                        : 'bg-[#0B1220] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Presets for Quick Testing */}
            <div className="p-3 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-2">
              <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulate Regional Voice Audio Input:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleVoicePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSimulateAudioInput(preset)}
                    className="p-2.5 rounded-lg bg-[#111A2B] hover:bg-[#162238] text-slate-300 border border-[#1E2D4A] text-left text-xs transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-white block text-[11px] truncate">{preset.title}</span>
                      <span className="text-[10px] text-slate-400 italic truncate block">"{preset.text}"</span>
                    </div>
                    <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Record Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="relative">
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isRecording ? `Listening on-device in ${selectedLanguage}...` : `Type or speak your thoughts in ${selectedLanguage} (secure & confidential)...`}
                  className={`w-full bg-[#0B1220] border rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    isRecording ? 'border-amber-500 bg-[#162238]/60' : 'border-[#1E2D4A] focus:border-amber-500/60'
                  }`}
                />
                
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`absolute bottom-3.5 right-3.5 p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isRecording 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-[#162238] hover:bg-[#1D2D49] text-amber-400 border border-[#1E2D4A]'
                  }`}
                  title="Toggle Microphone Recording"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  On-device INT8 model processes sentiment vector locally with zero data egress.
                </span>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer self-end sm:self-auto"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>Analyze On-Device</span>
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* Right Col: Instant Sentiment Breakdown & History */}
        <div className="space-y-5">
          
          {/* Analysis Breakdown */}
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-[#1E2D4A] pb-2">
              On-Device NLP Analysis
            </h4>

            {latestAnalysis ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#0B1220] rounded-xl border border-[#1E2D4A]">
                  <span className="text-slate-300 font-medium">Sentiment Index:</span>
                  <span className={`font-mono text-sm font-bold ${latestAnalysis.sentiment < -0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {latestAnalysis.sentiment}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Detected Stress Markers:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {latestAnalysis.distressMarkers.length > 0 ? (
                      latestAnalysis.distressMarkers.map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#162238] text-slate-200 border border-[#1E2D4A] text-[11px]">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-emerald-400 text-[11px]">Nominal Morale</span>
                    )}
                  </div>
                </div>

                {latestAnalysis.hasAcuteDistress && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Safety Signal Detected</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Tele-MANAS (14416) free 24/7 psychological support is available in the Emergency tab.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Record or type an entry to view real-time on-device sentiment breakdown.
              </div>
            )}
          </div>

          {/* Local Journal History */}
          <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-2">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Local Journal Records ({localJournalEntries.length})
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Encrypted</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {localJournalEntries.map(entry => (
                <div key={entry.id} className="p-3 bg-[#0B1220] border border-[#1E2D4A] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">{entry.date} • {entry.language}</span>
                    <span className="font-mono text-slate-400">Score: {entry.analysis.sentiment}</span>
                  </div>
                  <p className="text-slate-300 text-xs italic">"{entry.text}"</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
