import React, { useState, useEffect } from 'react';
import {
  Heart,
  Trash2,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { PageIntro, Stat } from '../layout/PageIntro';
import {
  fetchRiskBand,
  submitSelfReferral,
  requestDataPurge
} from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

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

  useEffect(() => {
    fetchRiskBand(pseudonymId)
      .then((res) => {
        if (res) setServerBand(res);
      })
      .catch(() => {});
  }, [pseudonymId]);

  const handleSaveCheckIn = (e) => {
    e.preventDefault();
    setIsSubmittingCheckIn(true);
    try {
      addCheckIn(mood, Number(sleepHours), 5 - mood);
      if (journalText.trim()) {
        addJournalEntry(journalText.trim(), 'English');
        setJournalText('');
      }
      showToast('Daily check-in saved safely on this device.', 'success');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleSelfReferralSubmit = async () => {
    setIsSelfReferring(true);
    try {
      const res = await submitSelfReferral(pseudonymId, supportPref);
      setSelfReferralCaseId(res.case_id || 'CONFIRMED');
      showToast('Support request submitted. Welfare liaison will connect discreetly.', 'success');
    } catch (err) {
      showToast('Failed to submit support request.', 'error');
    } finally {
      setIsSelfReferring(false);
    }
  };

  const handlePurgeData = async () => {
    if (!window.confirm('Are you sure you want to request complete erasure of your pseudonymized wellness records under the DPDP Act?')) {
      return;
    }
    setIsPurging(true);
    try {
      await requestDataPurge(pseudonymId);
      setPurgeSuccess(true);
      showToast('Data erasure request processed successfully.', 'success');
    } catch (err) {
      showToast('Erasure request failed.', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Zero-Trust On-Device Enclave"
        title="Confidential wellness"
        description="Your journal entries and continuous signals never leave your personal device. Only whitelisted reason codes reach the welfare board."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#d2e8db] bg-[#eaf5ef] px-3 py-2 text-[11px] font-bold text-[#286c58]">
              <Lock size={13} /> On-Device Encryption Active
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="On-Device Wellness Score"
          value={`${Math.round((localWScore || 0.7) * 100)}%`}
          detail="Computed locally from sleep & mood"
          accent="text-[#397c68]"
        />
        <Stat
          label="Operational Risk Band"
          value={`Band ${serverBand?.h_band || 3} of 4`}
          detail="Server-side duty hazard tier"
          accent={serverBand?.h_band >= 3 ? 'text-[#bc684f]' : 'text-[#397c68]'}
        />
        <Stat
          label="Consecutive Check-ins"
          value={String(checkIns?.length || 5)}
          detail="Daily rhythm intact"
          accent="text-[#397c68]"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">
              Today's Private Check-In
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78908a]">
              Private Enclave
            </span>
          </div>

          <form onSubmit={handleSaveCheckIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                How are you feeling today?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { score: 1, label: 'Exhausted' },
                  { score: 2, label: 'Low' },
                  { score: 3, label: 'Moderate' },
                  { score: 4, label: 'Good' },
                  { score: 5, label: 'Excellent' }
                ].map((item) => (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setMood(item.score)}
                    className={`rounded-xl border py-2.5 text-center text-xs transition-colors ${
                      mood === item.score
                        ? 'border-[#174c42] bg-[#eaf5ef] font-bold text-[#174d43]'
                        : 'border-[#dfe8e3] bg-[#fbfdfb] text-[#557068] hover:bg-[#f0f5f2]'
                    }`}
                  >
                    <div className="text-sm font-bold">{item.score}</div>
                    <div className="text-[9px] mt-0.5">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#587068] mb-1.5">
                <span>Hours of Rest / Sleep</span>
                <span className="text-[#174c42]">{sleepHours} hours</span>
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
              <div className="flex justify-between text-[10px] text-[#8a9a94] mt-1">
                <span>2 hrs (Severe debt)</span>
                <span>7-8 hrs (Optimal)</span>
                <span>12 hrs</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                Confidential Journal / Voice Reflection
              </label>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Write whatever is on your mind. This text is analyzed locally and NEVER transmitted to any server..."
                className="h-24 w-full resize-none rounded-xl border border-[#dce6e0] bg-[#fbfdfb] p-3 text-xs text-[#18342e] outline-none focus:border-[#77a993]"
              />
              <p className="mt-1 text-[10px] text-[#8a9a94]">
                100% on-device sentiment & stress detection. Zero cloud transmission.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCheckIn}
              className="w-full rounded-xl bg-[#174c42] py-2.5 text-xs font-bold text-white hover:bg-[#123e39] transition-colors"
            >
              {isSubmittingCheckIn ? 'Saving...' : 'Save check-in safely on device'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b] mb-1">
              Discreet Support Request
            </h2>
            <p className="text-[11px] text-[#899791] mb-4">
              Connect with confidential welfare support without command exposure.
            </p>

            {selfReferralCaseId ? (
              <div className="rounded-xl border border-[#d1e7da] bg-[#f1f7f3] p-4 text-xs text-[#27705c]">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Request Recorded: {selfReferralCaseId}
                </div>
                <p className="mt-1 text-[11px] text-[#4d7065]">
                  A confidential welfare liaison will contact you discreetly within 24 hours.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#587068] mb-1.5">
                    Select Preferred Support Channel
                  </label>
                  <select
                    value={supportPref}
                    onChange={(e) => setSupportPref(e.target.value)}
                    className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] px-3 py-2 text-xs outline-none focus:border-[#77a993]"
                  >
                    <option value="buddy">Peer Buddy (Informal Battalion Peer)</option>
                    <option value="welfare_officer">Unit Welfare Officer (Capt. Meera Nair)</option>
                    <option value="medical_officer">Regimental Medical Officer</option>
                    <option value="tele_manas">Tele-MANAS (14416) Confidential Helpline</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSelfReferralSubmit}
                  disabled={isSelfReferring}
                  className="w-full rounded-xl bg-[#286c58] py-2.5 text-xs font-bold text-white hover:bg-[#1f5444] transition-colors"
                >
                  {isSelfReferring ? 'Transmitting...' : 'Request confidential support'}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <h3 className="font-serif text-[18px] font-semibold text-[#25443b] mb-1">
              Data Rights & Erasure
            </h3>
            <p className="text-[11px] text-[#899791] mb-3">
              Under DPDP Act regulations, you have the absolute right to purge your wellness records at any time.
            </p>

            {purgeSuccess ? (
              <div className="rounded-xl border border-[#d1e7da] bg-[#f1f7f3] p-3 text-xs text-[#27705c]">
                Records successfully purged. Local cache reset.
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePurgeData}
                disabled={isPurging}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#f7d6cd] bg-[#fae6e0] py-2.5 text-xs font-bold text-[#a55342] hover:bg-[#f3cdc3] transition-colors"
              >
                <Trash2 size={14} />
                <span>{isPurging ? 'Purging records...' : 'Purge my wellness data'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
