import React, { useState, useEffect } from 'react';
import {
  Heart,
  Trash2,
  CheckCircle2,
  Lock
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
    showToast
  } = useAppState();

  const [lang, setLang] = useState('en');
  const t = PERSONNEL_STRINGS[lang] || PERSONNEL_STRINGS.en;

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

  const tempoInsufficient = serverBand?.confidence === 'insufficient_history';

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
          <div className="flex items-center gap-2">
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
              <Lock size={13} /> On-device only
            </div>
          </div>
        }
      />

      {!consented && (
        <div className="mb-4 rounded-2xl border border-[#d2e8db] bg-[#f1f7f3] p-5">
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

      <div className="grid gap-4 md:grid-cols-3">
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
    </>
  );
}
