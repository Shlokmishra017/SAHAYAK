import React, { useState } from 'react';
import {
  MessageCircle,
  AlertCircle,
  LockKeyhole,
  ClipboardCheck,
  ArrowUpRight,
  Phone,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { PageIntro } from '../layout/PageIntro';

const GUIDANCE_ARTICLES = {
  'Starting a conversation': {
    title: 'Starting a conversation',
    subtitle: 'Psychological First Aid & Check-In Protocol for Uniformed Services',
    icon: MessageCircle,
    tag: 'Communication Protocol',
    readTime: '3 min read',
    summary:
      'How to initiate supportive, non-stigmatizing welfare dialogues with jawans and personnel without triggering operational apprehension or defensiveness.',
    dosAndDonts: [
      {
        type: 'do',
        title: 'DO: Hold conversations in informal, neutral settings',
        description: 'Meet over tea in the mess or recreation room, away from formal orderly rooms and disciplinary spaces.'
      },
      {
        type: 'do',
        title: 'DO: Anchor on operational tempo and fatigue',
        description: 'Ask about continuous shifts and sleep: "Alpha Company had intense patrol duties this week. How are you holding up?"'
      },
      {
        type: 'dont',
        title: "DON'T: Mention system flags or surveillance",
        description: 'Never say: "The AI system flagged your account." Frame check-ins as proactive care.'
      },
      {
        type: 'dont',
        title: "DON'T: Threaten operational grounding",
        description: 'Reassure the jawan that opening up about home emergencies or fatigue will not result in career penalties.'
      }
    ],
    sections: [
      {
        heading: 'Phase 1: Establishing Rapport & Normalizing Fatigue',
        body: 'Uniformed personnel often hesitate to voice exhaustion due to fears of appearing unfit. Start with low-stakes conversation in everyday language (Hindi or regional dialect). Acknowledge that high-alert deployments naturally drain cognitive and physical energy.'
      },
      {
        heading: 'Phase 2: Exploring Stressors Without Pressure',
        body: 'Listen for subtle references to domestic crises, unresolved leave applications, or prolonged sleeplessness. Allow pauses—personnel under stress often need time to articulate personal worries.'
      },
      {
        heading: 'Phase 3: Agreeing on a Supportive Next Step',
        body: 'Conclude with a concrete, collaborative agreement. This could be pairing with a trusted peer buddy, adjusting night duty variance for 48 hours, or scheduling a confidential follow-up connect.'
      }
    ]
  },

  'When to escalate': {
    title: 'When to escalate',
    subtitle: 'Operational Triage & Life-Safety Escalation Matrix',
    icon: AlertCircle,
    tag: 'Triage & Clinical Safety',
    readTime: '4 min read',
    summary:
      'Clear, objective thresholds for determining when informal care must be elevated to clinical psychiatric support or command rest rotation.',
    dosAndDonts: [
      {
        type: 'do',
        title: 'DO: Act immediately on explicit despair signals',
        description: 'Any mention of hopelessness or self-harm warrants immediate, warm, non-punitive escort to the Medical Officer.'
      },
      {
        type: 'do',
        title: 'DO: Coordinate with the Regimental Medical Officer (RMO)',
        description: 'Involve clinical professionals early to assess somatic fatigue and pharmacological sleep support if needed.'
      },
      {
        type: 'dont',
        title: "DON'T: Delay in cases with acute distress markers",
        description: 'Do not adopt a "wait-and-see" stance when acute distress markers combine with severe sleep loss.'
      },
      {
        type: 'dont',
        title: "DON'T: Confiscate weapons punitively",
        description: 'If arms restrictions are clinically necessary, conduct the transition with dignity and peer support.'
      }
    ],
    sections: [
      {
        heading: 'Tier 1: Routine / Informal Care',
        body: 'Mild sleep fluctuation or single leave denial. Protocol: Peer buddy check-in, informal conversation by Welfare Officer, schedule follow-up within 7 days.'
      },
      {
        heading: 'Tier 2: Elevated Operational Welfare Concern',
        body: 'Continuous deployment >60 days without rotation, cluster of denied emergency leaves, or marked behavioral withdrawal. Protocol: Welfare counseling, recommendation of mandatory 72-hour rest stand-down, liaison with company commander.'
      },
      {
        heading: 'Tier 3: Acute Clinical Life-Safety Emergency',
        body: 'Explicit self-harm indicators or profound disorientation. Protocol: Initiate dual-custodian Break-Glass procedure to verify service identity, immediate contact with Tele-MANAS (14416) / RMO, and 24/7 peer buddy supervision.'
      }
    ]
  },

  'Privacy by default': {
    title: 'Privacy by default',
    subtitle: 'Zero-Trust Enclave & Statutory DPDP Act Governance',
    icon: LockKeyhole,
    tag: 'Governance & Trust',
    readTime: '3 min read',
    summary:
      'How the SAHAYAK platform mathematically guards personnel identities to foster authentic psychological safety without surveillance fears.',
    dosAndDonts: [
      {
        type: 'do',
        title: 'DO: Reassure jawans that raw journal text never uploads',
        description: 'Make clear that journal reflections and voice notes are analyzed 100% on their personal mobile device.'
      },
      {
        type: 'do',
        title: 'DO: Respect the dual-custodian barrier',
        description: 'Identity de-anonymization is strictly locked behind concurrent digital PINs from Welfare and Medical officers.'
      },
      {
        type: 'dont',
        title: "DON'T: Seek identity reveal for administrative curiosity",
        description: 'Break-Glass must be reserved strictly for life-safety situations. Every request is permanently audit-logged.'
      },
      {
        type: 'dont',
        title: "DON'T: Share unaggregated data with commanders",
        description: 'Commanders receive only k-anonymous (n ≥ 20) aggregates. Individual cohort data under 20 personnel is suppressed.'
      }
    ],
    sections: [
      {
        heading: 'Zero-Trust Client Enclave (Z0 Processing)',
        body: 'All journal entries, mood logs, and continuous biometric scores are processed in local on-device memory. No raw journal words or continuous score numbers ever leave the phone.'
      },
      {
        heading: 'Closed-Vocabulary Reason Codes',
        body: 'The server receives only whitelisted tokens such as RC_SUSTAINED_DEPLOYMENT or RC_SLEEP_DEGRADATION_TREND. This prevents unconstrained surveillance while giving officers actionable welfare context.'
      },
      {
        heading: 'Cryptographic Audit Trail (SHA-256 Merkle Chain)',
        body: 'Every time an officer views a case detail or attempts Break-Glass access, an immutable SHA-256 hash block is written. The audit trail is independently verifiable by Systems Auditors.'
      }
    ]
  },

  'Follow-up rhythm': {
    title: 'Follow-up rhythm',
    subtitle: 'Sustained Care & Operational Stand-Down Rhythm',
    icon: ClipboardCheck,
    tag: 'Operational Continuity',
    readTime: '3 min read',
    summary:
      'Preventing "one-off" check-ins through a structured, predictable 14-day welfare follow-up cadence.',
    dosAndDonts: [
      {
        type: 'do',
        title: 'DO: Establish a clear Day-3 and Day-7 touchpoint',
        description: 'Quick informal check-ins reinforce genuine care and help evaluate whether fatigue has begun to abate.'
      },
      {
        type: 'do',
        title: 'DO: Document supportive actions, not gossip',
        description: 'Record sanitized care actions (e.g. "Rest rotation recommended") rather than personal domestic details.'
      },
      {
        type: 'dont',
        title: "DON'T: Close cases prematurely",
        description: 'Keep the case in "Follow-up" status until the jawan reports at least 5 consecutive days of restorative sleep.'
      },
      {
        type: 'dont',
        title: "DON'T: Leave jawans without a point of contact",
        description: 'Ensure the personnel member always knows the direct contact number of the Unit Welfare Officer and Tele-MANAS.'
      }
    ],
    sections: [
      {
        heading: 'Day 1: Initial Intervention & Relief Action',
        body: 'Log the supportive action taken (e.g., peer buddy assignment, 72h operational rest, or informal welfare counseling). Agree on a specific time for the next brief connect.'
      },
      {
        heading: 'Day 3 & 7: Informal Pulse Check',
        body: 'A brief 5-minute informal touchpoint. Verify that shift adjustments have been respected by sub-unit commanders and that the jawan is experiencing improved rest.'
      },
      {
        heading: 'Day 14: Review & Case Resolution',
        body: 'Assess whether unit baseline has normalized. If fatigue markers have cleared and sleep is restored, mark the case as resolved without recording any disciplinary blemish in service records.'
      }
    ]
  }
};

export function GuidanceView() {
  const [selectedArticleKey, setSelectedArticleKey] = useState(null);

  const activeArticle = selectedArticleKey ? GUIDANCE_ARTICLES[selectedArticleKey] : null;

  return (
    <>
      <PageIntro
        eyebrow="Clinical Protocol & Support Framework"
        title="Guidance"
        description="Practical support for welfare conversations, escalation, and privacy by default."
        action={
          <a
            href="tel:14416"
            className="flex items-center gap-2 rounded-xl border border-[#dce6e0] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-[#557068] hover:bg-[#f8fbf9] transition-colors"
          >
            <Phone size={14} className="text-[#27705c]" />
            Tele-MANAS Hotline: 14416
          </a>
        }
      />

      {/* 4 Guidance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <GuideCard
          title="Starting a conversation"
          icon={MessageCircle}
          tag="Communication Protocol"
          text="Use open, private questions. Let the person choose what they want to share and avoid assumptions. Create a psychologically safe space without fear of disciplinary consequence."
          onRead={() => setSelectedArticleKey('Starting a conversation')}
        />
        <GuideCard
          title="When to escalate"
          icon={AlertCircle}
          tag="Triage & Clinical Safety"
          text="Escalate when there is an immediate safety concern, repeated missed contact, acute distress signal, or an operational fatigue pattern that requires specialist clinical support."
          onRead={() => setSelectedArticleKey('When to escalate')}
        />
        <GuideCard
          title="Privacy by default"
          icon={LockKeyhole}
          tag="Governance & Trust"
          text="Keep identities protected. Request access only when strictly necessary to provide care under dual-custodian authorization, and always record the clinical justification."
          onRead={() => setSelectedArticleKey('Privacy by default')}
        />
        <GuideCard
          title="Follow-up rhythm"
          icon={ClipboardCheck}
          tag="Operational Continuity"
          text="Agree on a next step together, set a clear follow-up date, and record the supportive action rather than surveillance details in the welfare ledger."
          onRead={() => setSelectedArticleKey('Follow-up rhythm')}
        />
      </div>

      {/* Emergency Resources Card */}
      <div className="mt-6 rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
        <h3 className="font-serif text-[19px] font-semibold text-[#25443b] mb-2">
          Statutory Support & Tele-MANAS Hotline
        </h3>
        <p className="text-xs text-[#70827b] leading-relaxed mb-4">
          Tele-MANAS is India's 24/7 toll-free mental health helpline, providing free, confidential psychological support in multiple regional languages. Available to all armed forces and paramilitary personnel and their families.
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#27705c]">
          <a
            href="tel:14416"
            className="rounded-xl border border-[#d2e8db] bg-[#eaf5ef] px-4 py-2.5 flex items-center gap-2 hover:bg-[#d5e9df] transition-colors"
          >
            <Phone size={14} /> Toll-Free: 14416 / 1800-891-4416
          </a>
          <div className="rounded-xl border border-[#dfe8e3] bg-[#f8fbf9] px-4 py-2.5 text-[#557068]">
            Available 24/7 · 20+ Languages · 100% Confidential
          </div>
        </div>
      </div>

      {/* Guidance Reader Modal */}
      {activeArticle && (
        <GuidanceReaderModal
          article={activeArticle}
          onClose={() => setSelectedArticleKey(null)}
        />
      )}
    </>
  );
}

function GuideCard({ title, icon: Icon, tag, text, onRead }) {
  return (
    <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_30px_rgba(30,72,58,0.035)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#eaf5ef] text-[#286c58]">
            <Icon size={18} />
          </div>
          {tag && (
            <span className="rounded-md bg-[#f1f7f3] px-2 py-0.5 text-[10px] font-bold text-[#27705c]">
              {tag}
            </span>
          )}
        </div>
        <h2 className="font-serif text-[19px] font-semibold text-[#25443b]">{title}</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[#70827b]">{text}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-[#edf1ef]">
        <button
          onClick={onRead}
          className="text-[11px] font-bold text-[#397c68] hover:text-[#174c42] transition-colors flex items-center gap-1.5"
        >
          <span>Read guidance</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}

function GuidanceReaderModal({ article, onClose }) {
  const Icon = article.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14332d]/30 backdrop-blur-[2px] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[#dbe8e1] bg-white p-6 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top */}
        <div className="flex items-start justify-between border-b border-[#edf1ef] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#eaf5ef] text-[#286c58]">
              <Icon size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#eaf5ef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#27705c]">
                  {article.tag}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#8a9a94]">
                  <Clock size={11} /> {article.readTime}
                </span>
              </div>
              <h2 className="mt-1 font-serif text-[22px] font-semibold text-[#21453b]">
                {article.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9aa7a2] hover:text-[#52645e] transition-colors p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subtitle & Summary */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#3b554c]">{article.subtitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#6f8079] bg-[#f8fbf9] p-3 rounded-xl border border-[#edf1ef]">
            {article.summary}
          </p>
        </div>

        {/* Dos & Don'ts Checklist */}
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a94] mb-2.5">
            Operational Dos & Don'ts
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {article.dosAndDonts.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-3 text-xs ${
                  item.type === 'do'
                    ? 'border-[#d1e7da] bg-[#f1f7f3]'
                    : 'border-[#fae6e0] bg-[#fffaf8]'
                }`}
              >
                <div
                  className={`font-semibold flex items-center gap-1.5 ${
                    item.type === 'do' ? 'text-[#27705c]' : 'text-[#a55342]'
                  }`}
                >
                  {item.type === 'do' ? (
                    <CheckCircle2 size={13} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={13} className="shrink-0" />
                  )}
                  <span>{item.title}</span>
                </div>
                <p
                  className={`mt-1 text-[11px] leading-relaxed ${
                    item.type === 'do' ? 'text-[#4d7065]' : 'text-[#843627]'
                  }`}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Guidance Sections */}
        <div className="mt-5 space-y-3.5 border-t border-[#edf1ef] pt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a94]">
            Detailed Procedure & Action Steps
          </div>
          {article.sections.map((sec, idx) => (
            <div key={idx} className="rounded-xl border border-[#dfe8e3] bg-white p-4">
              <h4 className="font-serif text-[15px] font-semibold text-[#18342e]">
                {sec.heading}
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-[#6c7d78]">
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        {/* Emergency Helpline Reminder & Close */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#edf1ef] pt-4">
          <a
            href="tel:14416"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#27705c] hover:underline"
          >
            <Phone size={13} />
            <span>Tele-MANAS Support: 14416 (24/7)</span>
          </a>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#174c42] px-4 py-2 text-xs font-bold text-white hover:bg-[#123e39] transition-colors"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
}
