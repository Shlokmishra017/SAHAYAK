import React from 'react';

export function GlassCard({ children, className = '', hover = false, elevated = false }) {
  return (
    <div className={`
      ${elevated ? 'surface-card-elevated' : 'surface-card'} 
      ${hover ? 'surface-card-interactive' : ''} 
      p-5
      ${className}
    `}>
      {children}
    </div>
  );
}

export function StatusBadge({ status, tier, label }) {
  const text = label || tier || status || 'nominal';
  const val = text.toLowerCase();

  const styles = {
    critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    elevated: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    emerging: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    nominal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    open: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    in_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    intervention_active: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  const dotColors = {
    critical: 'bg-rose-400',
    elevated: 'bg-amber-400',
    emerging: 'bg-teal-400',
    nominal: 'bg-emerald-400',
    open: 'bg-rose-400',
    in_review: 'bg-amber-400',
    intervention_active: 'bg-blue-400',
    closed: 'bg-slate-400',
  };

  const currentStyle = styles[val] || styles.nominal;
  const currentDot = dotColors[val] || dotColors.nominal;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide border ${currentStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`}></span>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

export function ReasonTag({ code }) {
  const codeMap = {
    RC_SUSTAINED_DEPLOYMENT: { title: "Prolonged Deployment (>60 Days)", color: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
    RC_DENIED_LEAVE_CLUSTER: { title: "Denied Leave Cluster", color: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
    RC_POST_LEAVE_VULNERABILITY: { title: "Post-Leave Window (Days 7-21)", color: "border-orange-500/30 bg-orange-500/10 text-orange-200" },
    RC_NIGHT_SHIFT_OVERLOAD: { title: "Night Shift Overload", color: "border-purple-500/30 bg-purple-500/10 text-purple-200" },
    RC_FREQUENT_TRANSFER: { title: "Frequent Transfer / Relocation", color: "border-blue-500/30 bg-blue-500/10 text-blue-200" },
    RC_SLEEP_DEGRADATION_TREND: { title: "Sleep Degradation Trend", color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" },
    RC_MOOD_TRAJECTORY_DROP: { title: "Wellness Downward Slope", color: "border-teal-500/30 bg-teal-500/10 text-teal-200" },
    RC_SOMATIC_FATIGUE_CLUSTER: { title: "Somatic Fatigue Pattern", color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" },
    RC_COHESION_FRICTION_ANOMALY: { title: "Unit Climate Anomaly", color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200" },
    RC_ACUTE_DISTRESS_MARKER: { title: "Acute Safety Signal (Tele-MANAS Active)", color: "border-red-500/40 bg-red-500/20 text-red-200 font-semibold" }
  };

  const meta = codeMap[code] || { title: code, color: "border-slate-700 bg-slate-800/80 text-slate-300" };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${meta.color}`}>
      {meta.title}
    </span>
  );
}
