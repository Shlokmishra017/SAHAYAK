import React, { useState } from 'react';
import { CheckCircle2, Send, Sparkles } from 'lucide-react';
import { submitOfficerLabel } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function LabelFeedbackLoop({ caseId, currentLabel }) {
  const { showToast, refreshGlobalData } = useAppState();
  const [selectedLabel, setSelectedLabel] = useState(currentLabel || 'true_concern');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedLabel, setSavedLabel] = useState(currentLabel);

  const labelOptions = [
    {
      id: 'true_concern',
      title: 'True Concern (Validated Need)',
      desc: 'Personnel genuinely required welfare support. Model correctly surfaced vulnerability.',
    },
    {
      id: 'false_alarm',
      title: 'False Alarm (Benign Artifact)',
      desc: 'Personnel was coping well / temporary variance. Flag did not warrant escalation.',
    },
    {
      id: 'inconclusive',
      title: 'Inconclusive / Ongoing Review',
      desc: 'Insufficient observations or case is in early evaluation stage.',
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitOfficerLabel(caseId, selectedLabel, feedback);
      setSavedLabel(selectedLabel);
      showToast("Weak-label submitted for continuous model calibration.", "success");
      refreshGlobalData();
    } catch (err) {
      showToast("Failed to submit label feedback.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      
      <div className="p-3.5 bg-[#0B1220] border border-[#1E2D4A] rounded-xl space-y-1 text-slate-300">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Continuous Weak-Supervision Feedback Loop</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Officer outcome labels feed back into the model to recalibrate unit-relative weights and minimize false positive alert fatigue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-slate-300 font-medium mb-2 block">
            Select Officer Assessment Label for this Case:
          </label>
          <div className="space-y-2">
            {labelOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedLabel(opt.id)}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  selectedLabel === opt.id
                    ? 'bg-[#162238] border-amber-500/50 text-slate-100'
                    : 'bg-[#0B1220] border-[#1E2D4A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between text-white">
                  <span>{opt.title}</span>
                  {selectedLabel === opt.id && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-slate-300 font-medium mb-1 block">
            Calibration Context / Observations:
          </label>
          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="E.g., Sleep deficit was due to short-notice route security deployment..."
            className="w-full bg-[#0B1220] border border-[#1E2D4A] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            {savedLabel ? `Current Saved: ${savedLabel.replace('_', ' ').toUpperCase()}` : 'Unlabeled Case'}
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-slate-900" />
            <span>{isSubmitting ? 'Saving...' : 'Submit Calibration Label'}</span>
          </button>
        </div>
      </form>

    </div>
  );
}
