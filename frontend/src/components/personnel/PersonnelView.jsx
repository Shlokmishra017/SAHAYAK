import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Trash2,
  CheckCircle2,
  Lock,
  Smartphone,
  ShieldCheck,
  Activity,
  Wifi,
  WifiOff,
  RotateCw,
  Sparkles,
  AlertCircle,
  Download,
  MonitorSmartphone,
  Cpu,
  Cloud,
  CloudOff
} from 'lucide-react';
import { PageIntro, Stat } from '../layout/PageIntro';
import { BackendErrorState, DemoModeBanner } from '../common/DemoModeBanner';
import {
  fetchRiskBand,
  submitSelfReferral,
  requestDataPurge
} from '../../services/api';
import { PERSONNEL_STRINGS } from '../../services/strings';
import { useAppState } from '../../context/AppStateContext';

const CONSENT_KEY = 'sahayak_wellness_consent';

function rhythmWord(wScore, t) {
  if ((wScore ?? 0.7) < 0.45) return t.steady;
  if ((wScore ?? 0.7) < 0.65) return t.uneven;
  return t.low;
}

export function PersonnelView() {
  const {
    pseudonymId,
    checkIns,
    addCheckIn,
    addJournalEntry,
    localWScore,
    hBandInfo,
    showToast,
    isOnline,
    escalationOutbox,
    syncOutbox,
    isAirplaneMode,
    setIsAirplaneMode
  } = useAppState();

  const [lang, setLang] = useState('en');
  const [isPhoneFrame, setIsPhoneFrame] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [isSyncingManually, setIsSyncingManually] = useState(false);
  const [showPwaInstallPrompt, setShowPwaInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const t = PERSONNEL_STRINGS[lang] || PERSONNEL_STRINGS.en;

  // PWA Install Prompt Handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after user has interacted a bit
      setTimeout(() => setShowPwaInstallPrompt(true), 3000);
    };
    const handleAppInstalled = () => {
      setShowPwaInstallPrompt(false);
      setDeferredPrompt(null);
      showToast('Sahayak installed — works offline on your device.', 'success');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Installing Sahayak for offline field use...', 'info');
    }
    setDeferredPrompt(null);
    setShowPwaInstallPrompt(false);
  };

  const [mood, setMood] = useState(3);
  const [sleepHours, setSleepHours] = useState(6.5);
  const [journalText, setJournalText] = useState('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  const [supportPref, setSupportPref] = useState('buddy');
  const [isSelfReferring, setIsSelfReferring] = useState(false);
  const [selfReferralCaseId, setSelfReferralCaseId] = useState(null);

  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  const [serverBand, setServerBand] = useState(hBandInfo);
  const [bandError, setBandError] = useState(null);

  const [consented, setConsented] = useState(false);
  useEffect(() => {
    try {
      setConsented(window.localStorage.getItem(CONSENT_KEY) === 'yes');
    } catch {
      setConsented(false);
    }
  }, []);

  const giveConsent = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, 'yes');
    } catch {
      // storage unavailable — consent lasts for this session only
    }
    setConsented(true);
  };

  useEffect(() => {
    fetchRiskBand(pseudonymId)
      .then((res) => {
        if (res) setServerBand(res);
      })
      .catch((err) => {
        setBandError(err?.message || 'Tempo reading could not be loaded.');
      });
  }, [pseudonymId]);

  const handleSaveCheckIn = (e) => {
    e.preventDefault();
    if (!consented) return;
    setIsSubmittingCheckIn(true);
    try {
      addCheckIn(mood, Number(sleepHours), 5 - mood);
      if (journalText.trim()) {
        addJournalEntry(journalText.trim(), lang === 'hi' ? 'Hindi' : 'English');
        setJournalText('');
      }
      showToast('Daily check-in saved safely on this device.', 'success');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleSelfReferralSubmit = async () => {
    if (!consented) return;
    setIsSelfReferring(true);
    try {
      const res = await submitSelfReferral(pseudonymId, supportPref);
      if (res?.__demo) {
        setSelfReferralCaseId(res.case_id || 'CONFIRMED');
        showToast('Demo mode: support request simulated locally.', 'info');
      } else {
        setSelfReferralCaseId(res.case_id || 'CONFIRMED');
        showToast('Support request submitted. Welfare liaison will connect discreetly.', 'success');
      }
    } catch (err) {
      if (err?.code === 'BACKEND_UNAVAILABLE') {
        const { enqueueOutbox } = await import('../../services/outbox');
        await enqueueOutbox('self_referral', {
          client_event_id: crypto.randomUUID(),
          pseudonym_id: pseudonymId,
          support_type_preference: supportPref,
          request_timestamp: new Date().toISOString()
        });
        showToast('Offline: support request saved locally and will sync on reconnect.', 'info');
      } else {
        showToast(err?.message || 'Failed to submit support request.', 'error');
      }
    } finally {
      setIsSelfReferring(false);
    }
  };

  const handlePurgeData = async () => {
    const confirmation = window.prompt(
      `Type CONFIRM-${pseudonymId} to confirm permanent erasure of your case records. Audit events are retained per policy (docs/DataRetention.md).`
    );
    if (confirmation !== `CONFIRM-${pseudonymId}`) {
      showToast('Erasure cancelled: confirmation token did not match.', 'info');
      return;
    }
    setIsPurging(true);
    try {
      const res = await requestDataPurge(pseudonymId, confirmation);
      setPurgeSuccess(true);
      showToast(
        `Data erasure processed: ${res.purged_cases ?? 0} case(s), ${res.purged_interventions ?? 0} intervention(s). ${res.retained || ''}`,
        'success'
      );
    } catch (err) {
      showToast(err?.message || 'Erasure request failed.', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingManually(true);
    try {
      await syncOutbox();
    } finally {
      setIsSyncingManually(false);
    }
  };

  const tempoInsufficient = serverBand?.confidence === 'insufficient_history';

  const viewContent = (
    <div className="space-y-5">
      {/* Network & Outbox Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d2e8db] bg-[#f4f9f6] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <span className="inline-block size-2 rounded-full bg-[#286c58] animate-pulse" />
              <span className="font-semibold text-[#25443b]">
                {lang === 'hi' ? '🟢 सुरक्षित सिंक सक्रिय' : '🟢 Secure Sync Active'}
              </span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-[#c5793e]" />
              <span className="font-semibold text-[#824f25]">
                {lang === 'hi' ? '🟠 फ़ील्ड मोड (ऑफ़लाइन) — डेटा इसी फ़ोन पर सुरक्षित है' : '🟠 Field Mode (Offline) — Check-in saved securely on device'}
              </span>
            </>
          )}
        </div>
        {escalationOutbox?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#e3efe8] px-2.5 py-0.5 text-[11px] font-bold text-[#1f5f4d]">
              {escalationOutbox.length} {lang === 'hi' ? 'सिंक लंबित' : 'pending sync'}
            </span>
            {isOnline && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncingManually}
                className="flex items-center gap-1 text-[11px] font-bold text-[#174c42] hover:underline"
              >
                <RotateCw size={11} className={isSyncingManually ? 'animate-spin' : ''} />
                {lang === 'hi' ? 'अभी सिंक करें' : 'Sync now'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Core Privacy & Zero-Surveillance Architecture Callout */}
      <div className="rounded-2xl border border-[#cbe4d5] bg-gradient-to-br from-[#f2f8f4] to-[#eaf4ee] p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#174c42] text-white">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d5c4b]">
                {lang === 'hi' ? 'शून्य-निगरानी आर्किटेक्चर (Z0 एन्क्लेव)' : 'Zero-Surveillance Architecture (Z0 Enclave)'}
              </h3>
              <span className="rounded-full bg-[#d7ecdf] px-2.5 py-0.5 text-[10px] font-bold text-[#185544]">
                {lang === 'hi' ? 'केवल कल्याण सहायता · गैर-दंडात्मक' : 'Welfare Only · Non-Punitive'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#3c6457]">
              <strong>{lang === 'hi' ? 'इस डिवाइस पर निजी क्या रहता है:' : 'What stays private on this phone:'}</strong>{' '}
              {lang === 'hi'
                ? 'आपकी व्यक्तिगत जर्नल प्रविष्टियाँ, मूड/नींद के सटीक मान और व्यक्तिगत भावनाएँ इस फ़ोन को कभी नहीं छोड़ती हैं।'
                : 'Your personal journal entries, exact slider scores, and private thoughts never leave this device.'}
            </p>
            <p className="text-xs leading-relaxed text-[#3c6457]">
              <strong>{lang === 'hi' ? 'सर्वर को क्या भेजा जाता है:' : 'What leaves this device:'}</strong>{' '}
              {lang === 'hi'
                ? 'केवल अनाम रीज़न कोड (उदा. RC_SLEEP_DEGRADATION_TREND) कल्याण बोर्ड तक पहुँचते हैं। कभी भी पदोन्नति, पोस्टिंग या अनुशासनात्मक समीक्षा के लिए उपयोग नहीं किया जाता।'
                : 'Only anonymized, closed-vocabulary reason codes reach welfare triage. Never accessible for disciplinary records or postings.'}
            </p>
          </div>
        </div>
      </div>

      {!consented && (
        <div className="rounded-2xl border border-[#d2e8db] bg-[#f1f7f3] p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#286c58]">
              <Heart size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-[17px] font-semibold text-[#214c3f]">{t.consentTitle}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#4d7065]">{t.consentBody}</p>
              <button
                type="button"
                onClick={giveConsent}
                className="mt-3 rounded-xl bg-[#174c42] px-4 py-2 text-xs font-bold text-white hover:bg-[#123e39] transition-colors"
              >
                {t.consentAgree}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={t.rhythmLabel}
          value={rhythmWord(localWScore, t)}
          detail={t.rhythmDetail}
          accent="text-[#397c68]"
        />
        <Stat
          label={t.tempoLabel}
          value={
            tempoInsufficient
              ? t.tempoBuilding
              : (serverBand?.h_band ?? 0) >= 3 ? t.tempoHigh : t.tempoNormal
          }
          detail={tempoInsufficient ? t.tempoBuildingDetail : t.tempoDetail}
          accent={(serverBand?.h_band ?? 0) >= 3 && !tempoInsufficient ? 'text-[#bc684f]' : 'text-[#397c68]'}
        />
        <Stat
          label={t.checkinsLabel}
          value={String(checkIns?.length || 0)}
          detail={t.checkinsDetail}
          accent="text-[#397c68]"
        />
      </div>

      {/* Simulated Wearable Input Card (Prototype Demo) */}
      <div className="rounded-2xl border border-[#d8e7de] bg-white p-5 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#2c7560]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#25443b]">
              {lang === 'hi' ? 'सिम्युलेटेड वेयरेबल बायोमेट्रिक फ़ीड' : 'Simulated Wearable Telemetry'}
            </h3>
          </div>
          <span className="rounded-full bg-[#faefe3] border border-[#ecd9be] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9a6428]">
            {lang === 'hi' ? 'प्रोटोटाइप डेमो' : 'Simulated Prototype Demo'}
          </span>
        </div>
        <p className="text-[11px] text-[#69827a] mb-3">
          {lang === 'hi'
            ? 'यह प्रदर्शित करता है कि अधिकृत स्मार्टवॉच सेंसर स्थानीय डिवाइस पर ऑन-डिवाइस वेलनेस ट्रेंड में कैसे एकीकृत होते हैं (कोई कच्चा बायोमेट्रिक डेटा सर्वर पर नहीं भेजा जाता)।'
            : 'Demonstrates where authorized biometric sensor streams integrate into local on-device trend analysis without raw biometric data egress.'}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#e5ede8] bg-[#f8faf8] p-2.5">
            <div className="text-[10px] font-bold text-[#6f857d]">Resting HR</div>
            <div className="text-sm font-bold text-[#23483e]">74 bpm</div>
            <div className="text-[9px] text-[#3d836e] mt-0.5">Baseline: 68</div>
          </div>
          <div className="rounded-xl border border-[#e5ede8] bg-[#f8faf8] p-2.5">
            <div className="text-[10px] font-bold text-[#6f857d]">Deep Sleep</div>
            <div className="text-sm font-bold text-[#23483e]">4.2 hrs</div>
            <div className="text-[9px] text-[#bf714d] mt-0.5">-35% vs baseline</div>
          </div>
          <div className="rounded-xl border border-[#e5ede8] bg-[#f8faf8] p-2.5">
            <div className="text-[10px] font-bold text-[#6f857d]">HRV Index</div>
            <div className="text-sm font-bold text-[#23483e]">48 ms</div>
            <div className="text-[9px] text-[#8e6d34] mt-0.5">Moderate load</div>
          </div>
        </div>
      </div>

      {/* How It Works — Honest AI/ML Framing (Task 7) */}
      <div className="rounded-2xl border border-[#d2e8db] bg-gradient-to-br from-[#f2f8f4] to-[#eaf4ee] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#174c42] text-white">
            <Cpu size={18} />
          </div>
          <div className="flex-1 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d5c4b]">How Your Wellness Trend Is Computed (On-Device)</h3>
            <div className="space-y-1.5 text-[11px] text-[#3c6457]">
              <p>
                <strong>No cloud AI. No LLM. No neural network.</strong> Everything runs locally on this device.
              </p>
              <p>
                <strong>What actually runs:</strong> A multilingual keyword lexicon (Hindi/English/Punjabi/Marathi) matches distress phrases in your journal, combined with an exponential moving average (EWMA) of your mood and sleep check-ins. This produces a local wellness score (wScore) fused with your unit's operational hazard band (hBand).
              </p>
              <p>
                <strong>Why this matters:</strong> Your raw journal text, exact slider values, and continuous scores never leave this phone. Only closed-vocabulary reason codes (e.g., RC_SLEEP_DEGRADATION_TREND) reach the welfare board — never for discipline, only for support.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">
              {t.checkinHeading}
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78908a]">
              {t.eyebrow}
            </span>
          </div>

          <form onSubmit={handleSaveCheckIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                {t.moodQuestion}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {t.moods.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setMood(i + 1)}
                    className={`rounded-xl border py-2.5 text-center text-xs transition-colors ${
                      mood === i + 1
                        ? 'border-[#174c42] bg-[#eaf5ef] font-bold text-[#174d43]'
                        : 'border-[#dfe8e3] bg-[#fbfdfb] text-[#557068] hover:bg-[#f0f5f2]'
                    }`}
                  >
                    <div className="text-sm font-bold">{i + 1}</div>
                    <div className="text-[9px] mt-0.5">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#587068] mb-1.5">
                <span>{t.sleepLabel}</span>
                <span className="text-[#174c42]">{sleepHours} {t.hours}</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full accent-[#174c42]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                {t.journalLabel}
              </label>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder={t.journalPlaceholder}
                className="h-24 w-full resize-none rounded-xl border border-[#dce6e0] bg-[#fbfdfb] p-3 text-xs text-[#18342e] outline-none focus:border-[#77a993]"
              />
              <p className="mt-1 text-[10px] text-[#8a9a94]">
                {t.journalNote}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCheckIn || !consented}
              title={!consented ? t.consentTitle : undefined}
              className="w-full rounded-xl bg-[#174c42] py-2.5 text-xs font-bold text-white hover:bg-[#123e39] transition-colors disabled:opacity-50"
            >
              {isSubmittingCheckIn ? t.saving : t.saveCheckin}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b] mb-1">
              {t.supportHeading}
            </h2>
            <p className="text-[11px] text-[#899791] mb-4">
              {t.supportBody}
            </p>

            {selfReferralCaseId ? (
              <div className="rounded-xl border border-[#d1e7da] bg-[#f1f7f3] p-4 text-xs text-[#27705c]">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> {t.supportHeading}: {selfReferralCaseId}
                </div>
                <p className="mt-1 text-[11px] text-[#4d7065]">
                  {t.supportDone}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                    {t.supportChannel}
                  </label>
                  <select
                    value={supportPref}
                    onChange={(e) => setSupportPref(e.target.value)}
                    className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] px-3 py-2 text-xs outline-none focus:border-[#77a993]"
                  >
                    <option value="buddy">{t.channels.buddy}</option>
                    <option value="welfare_officer">{t.channels.welfare_officer}</option>
                    <option value="medical_officer">{t.channels.medical_officer}</option>
                    <option value="tele_manas">{t.channels.tele_manas}</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSelfReferralSubmit}
                  disabled={isSelfReferring || !consented}
                  className="w-full rounded-xl bg-[#286c58] py-2.5 text-xs font-bold text-white hover:bg-[#1f5444] transition-colors disabled:opacity-50"
                >
                  {isSelfReferring ? t.transmitting : t.requestSupport}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <h3 className="font-serif text-[18px] font-semibold text-[#25443b] mb-1">
              {t.erasureHeading}
            </h3>
            <p className="text-[11px] text-[#899791] mb-3">
              {t.erasureBody}
            </p>

            {purgeSuccess ? (
              <div className="rounded-xl border border-[#d1e7da] bg-[#f1f7f3] p-3 text-xs text-[#27705c]">
                {t.purged}
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePurgeData}
                disabled={isPurging}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#f7d6cd] bg-[#fae6e0] py-2.5 text-xs font-bold text-[#a55342] hover:bg-[#f3cdc3] transition-colors"
              >
                <Trash2 size={14} />
                <span>{isPurging ? t.purging : t.purge}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Non-Diagnostic Clinical Boundary (Task 15) */}
      <div className="rounded-xl border border-[#dfe8e3] bg-[#fbfdfb] p-3 text-center text-[11px] text-[#638077]">
        <strong>{lang === 'hi' ? 'संचालन सूचना:' : 'Operational Notice:'}</strong>{' '}
        {lang === 'hi'
          ? 'सहायक केवल कल्याणकारी जोखिम विश्लेषण और कार्यभार संतुलन हेतु संकेत प्रदान करता है। यह कोई चिकित्सीय या मनोवैज्ञानिक निदान नहीं है।'
          : 'Sahayak provides proactive welfare risk triage and rest-cycle recommendations. It does not provide medical or psychiatric diagnoses.'}
      </div>
    </div>
  );

  return (
    <>
      <DemoModeBanner />
      {bandError && (
        <div className="mb-4">
          <BackendErrorState message={bandError} onRetry={() => window.location.reload()} />
        </div>
      )}
      <PageIntro
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPhoneFrame(!isPhoneFrame)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
                isPhoneFrame
                  ? 'border-[#174c42] bg-[#174c42] text-white shadow-sm'
                  : 'border-[#dfe8e3] bg-white text-[#46685f] hover:bg-[#f0f5f2]'
              }`}
              title="Toggle field mobile phone preview framing"
            >
              <Smartphone size={13} />
              <span>{isPhoneFrame ? 'Desktop Mode' : '📱 Field Phone View'}</span>
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-[#dfe8e3] bg-white p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`rounded-lg px-2.5 py-1.5 ${lang === 'en' ? 'bg-[#174c42] text-white' : 'text-[#557068]'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`rounded-lg px-2.5 py-1.5 ${lang === 'hi' ? 'bg-[#174c42] text-white' : 'text-[#557068]'}`}
              >
                हिंदी
              </button>
            </div>
            <div className="hidden items-center gap-1.5 rounded-xl border border-[#d2e8db] bg-[#eaf5ef] px-3 py-2 text-[11px] font-bold text-[#286c58] sm:flex">
              <Lock size={13} /> On-device Z0
            </div>
          </div>
        }
      />

      {isPhoneFrame ? (
        <div className="py-4">
          <div className="mx-auto max-w-[420px] rounded-[48px] border-[10px] border-[#1b3e34] bg-[#f8faf9] p-4 shadow-[0_25px_60px_-15px_rgba(20,50,40,0.4)] ring-1 ring-black/10">
            {/* Phone Speaker & Notch */}
            <div className="mx-auto mb-4 flex items-center justify-center gap-2">
              <div className="h-4 w-28 rounded-full bg-[#1b3e34]/30" />
              <div className="size-3 rounded-full bg-[#1b3e34]/30" />
            </div>
            {/* Field App Header Pill */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-[#1b3e34] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#d5e7df]">
              <span>SAHAYAK MOBILE PWA</span>
              <span>JAWAN SUITE</span>
            </div>
            {/* Offline Demo Toggle in Phone Frame */}
            <div className="mb-3 rounded-xl border border-[#d2e8db] bg-gradient-to-r from-[#eaf5ef] to-[#f2f8f4] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isOnline && !isAirplaneMode ? (
                    <>
                      <Wifi size={12} className="text-[#286c58]" />
                      <span className="font-semibold text-[#25443b] text-[10px]">🟢 Secure Sync Active</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} className="text-[#c5793e]" />
                      <span className="font-semibold text-[#824f25] text-[10px]">🟠 Field Mode (Offline)</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAirplaneMode(!isAirplaneMode)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold transition-all ${
                    isAirplaneMode
                      ? 'border-[#f7d6cd] bg-[#fae6e0] text-[#a55342]'
                      : 'border-[#d2e8db] bg-white text-[#286c58] hover:bg-[#f8fbf9]'
                  }`}
                  title={isAirplaneMode ? 'Go online (demo)' : 'Simulate offline (demo)'}
                >
                  {isAirplaneMode ? <Cloud size={11} /> : <CloudOff size={11} />}
                  <span>{isAirplaneMode ? 'Online' : 'Offline'}</span>
                </button>
              </div>
              <p className="mt-1 text-[9px] text-[#557068]">
                {isAirplaneMode 
                  ? (lang === 'hi' ? 'डेमो: फील्ड मोड — डेटा स्थानीय रूप से सहेजा जाता है' : 'Demo: Field mode — data saved locally')
                  : (lang === 'hi' ? 'डेमो: "ऑफ़लाइन करें" टैप करके फील्ड व्यवहार दिखाएँ' : 'Demo: Tap "Offline" to simulate field conditions')}
              </p>
            </div>
            {showPwaInstallPrompt && deferredPrompt && (
              <div className="mb-3 rounded-xl border border-[#174c42] bg-[#eaf5ef] p-3 text-[10px] animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone size={14} className="text-[#174c42]" />
                    <span className="font-bold text-[#174c42]">{lang === 'hi' ? 'फ़ील्ड उपयोग के लिए इंस्टॉल करें' : 'Install for Field Use'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePwaInstall}
                    className="shrink-0 rounded-lg bg-[#174c42] px-2.5 py-1.5 text-[10px] font-bold text-white"
                  >
                    {lang === 'hi' ? 'इंस्टॉल करें' : 'Install'}
                  </button>
                </div>
                <p className="mt-1 text-[#397c68]">{lang === 'hi' ? 'ऑफ़लाइन काम करता है — कोई नेटवर्क नहीं चाहिए' : 'Works offline — no network required'}</p>
              </div>
            )}
            {viewContent}
            {/* Home Indicator Bar */}
            <div className="mx-auto mt-6 h-1 w-32 rounded-full bg-[#1b3e34]/40" />
          </div>
        </div>
      ) : (
        viewContent
      )}
    </>
  );
}
