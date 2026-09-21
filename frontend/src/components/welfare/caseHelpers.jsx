import React from 'react';

export const signalDisplayMap = {
  RC_ACUTE_DISTRESS_MARKER: 'Acute emotional distress signal',
  RC_SUSTAINED_DEPLOYMENT: 'Prolonged deployment without rotation',
  RC_SLEEP_DEGRADATION_TREND: 'Sustained sleep fragmentation',
  RC_POST_LEAVE_VULNERABILITY: 'Post-leave vulnerability window',
  RC_NIGHT_SHIFT_OVERLOAD: 'Excessive night duty variance',
  RC_DENIED_LEAVE_CLUSTER: 'Multiple denied leave applications',
  RC_MOOD_TRAJECTORY_DROP: 'Wellness score downward trajectory',
  RC_SOMATIC_FATIGUE_CLUSTER: 'Chronic somatic exhaustion',
  RC_FREQUENT_TRANSFER: 'Frequent relocation stagnation',
  RC_COHESION_FRICTION_ANOMALY: 'Sub-unit climate anomaly'
};

export function getPrimarySignal(reasonCodes = []) {
  if (!reasonCodes || reasonCodes.length === 0) return 'Welfare check-in due';
  if (reasonCodes.includes('RC_ACUTE_DISTRESS_MARKER')) {
    return 'Acute emotional distress signal';
  }
  const first = reasonCodes[0];
  return signalDisplayMap[first] || first.replace(/^RC_/, '').replace(/_/g, ' ');
}

export function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hrs ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} days ago`;
}

export function getCaseInitials(caseItem) {
  if (!caseItem) return 'WF';
  if (caseItem.pseudonym_id) {
    const parts = caseItem.pseudonym_id.split('-');
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }
  if (caseItem.case_id) {
    return caseItem.case_id.slice(-2).toUpperCase();
  }
  return 'WF';
}

export function getCasePseudonymName(caseItem) {
  if (!caseItem) return 'Confidential Case';
  return caseItem.case_id ? `Case ${caseItem.case_id.replace(/^CASE-/, '')}` : 'Confidential Case';
}

export function getCaseTone(tier) {
  switch (tier) {
    case 'critical':
      return 'rose';
    case 'elevated':
      return 'amber';
    case 'emerging':
      return 'slate';
    default:
      return 'green';
  }
}

export function getRiskLabel(tier) {
  switch (tier) {
    case 'critical':
      return 'Priority';
    case 'elevated':
      return 'Elevated';
    case 'emerging':
      return 'Monitor';
    default:
      return 'Follow-up';
  }
}

export function Avatar({ initials, tone = 'slate' }) {
  const toneClasses =
    tone === 'rose'
      ? 'bg-[#f7e4de] text-[#a55342]'
      : tone === 'amber'
      ? 'bg-[#f5ead2] text-[#9b7132]'
      : tone === 'green'
      ? 'bg-[#d5f1dc] text-[#27705c]'
      : 'bg-[#e3ebec] text-[#60747a]';

  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${toneClasses}`}>
      {initials}
    </div>
  );
}

export function Risk({ value }) {
  const style =
    value === 'Priority' || value === 'critical'
      ? 'bg-[#fae6e0] text-[#a55342]'
      : value === 'Elevated' || value === 'elevated'
      ? 'bg-[#f7ecd5] text-[#9b7132]'
      : value === 'Follow-up' || value === 'normal'
      ? 'bg-[#d5f1dc] text-[#27705c]'
      : 'bg-[#e8eff0] text-[#5d7379]';

  const label =
    value === 'critical' ? 'Priority' :
    value === 'elevated' ? 'Elevated' :
    value === 'emerging' ? 'Monitor' :
    value;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style}`}>
      {label}
    </span>
  );
}

export function Signal({ label, value, tone = 'slate' }) {
  const color =
    tone === 'amber'
      ? 'text-[#a97532]'
      : tone === 'green'
      ? 'text-[#397c68]'
      : tone === 'rose'
      ? 'text-[#a55342]'
      : 'text-[#647773]';

  return (
    <div className="rounded-xl bg-[#f7faf8] p-3">
      <div className="text-[10px] text-[#91a19b]">{label}</div>
      <div className={`mt-1 text-[12px] font-semibold ${color}`}>{value}</div>
    </div>
  );
}
