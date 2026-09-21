import React from 'react';

export function PageIntro({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6c8d82]">
            <span className="size-1.5 rounded-full bg-[#4e9a77]" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[34px] leading-tight tracking-[-0.03em] text-[#18342e] sm:text-[41px]">
          {title}
        </h1>
        {description && <p className="mt-2 text-[13px] text-[#75857f]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, detail, accent = 'text-[#397c68]' }) {
  return (
    <div className="rounded-2xl border border-[#dfe8e3] bg-white px-4 py-4 shadow-[0_8px_30px_rgba(30,72,58,0.025)] sm:px-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a9a94]">{label}</div>
      <div className={`mt-2 font-serif text-[27px] font-semibold ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] text-[#7f9089]">{detail}</div>
    </div>
  );
}
