import React, { useState } from 'react';
import { Upload, FileCheck, AlertTriangle, Download } from 'lucide-react';
import { PageIntro } from '../layout/PageIntro';
import { BackendErrorState, DemoModeBanner } from '../common/DemoModeBanner';
import { importHrmsCsv } from '../../services/api';
import { useAppState } from '../../context/AppStateContext';

export function HrmsImportView() {
  const { showToast, refreshGlobalData } = useAppState();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a CSV file first.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importHrmsCsv(file);
      setResult(res);
      showToast(
        `HRMS import complete: ${res.rows_new} new, ${res.rows_updated} updated, ${res.rows_rejected} rejected.`,
        'success'
      );
      refreshGlobalData();
    } catch (err) {
      setError(err?.message || 'HRMS import failed.');
      showToast('HRMS import failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <DemoModeBanner />
      <PageIntro
        eyebrow="HRMS-Ready Ingestion Adapter"
        title="HRMS import"
        description="Upload a validated HRMS-style CSV export. Rows are schema-checked, de-duplicated, risk-scored, and routed into the welfare queue."
        action={
          <span className="rounded-xl border border-[#dfe8e3] bg-white px-3 py-2 text-[11px] font-semibold text-[#557068]">
            Validated exports only — not a live HRMS link
          </span>
        }
      />

      {error && (
        <div className="mb-4">
          <BackendErrorState message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">Upload export</h2>
          <p className="mt-1 text-[11px] text-[#899791]">
            Required columns: service_number, full_name, consecutive_days_deployed, rest_ratio_28d,
            leave_denial_ratio, days_since_leave_return, transfers_36m, family_colocated,
            night_duty_hours_28d, duty_hour_variance_28d, promotion_stagnation_yrs.
            Optional: rank, unit, record_date. Max 5000 rows / 2MB.
          </p>
          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#b5c7c0] bg-[#fbfdfb] p-4 text-xs text-[#557068] hover:bg-[#f0f5f2]">
              <Upload size={16} />
              <span>{file ? file.name : 'Choose CSV file…'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full rounded-xl bg-[#174c42] py-2.5 text-xs font-bold text-white hover:bg-[#123e39] transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Validating & importing…' : 'Validate & import'}
            </button>
          </form>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8a9a94]">
            <Download size={13} />
            <span>For the demo, use the sample export at backend/artifacts/hrms_sample.csv (includes invalid, duplicate, and below-threshold rows).</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">Import summary</h2>
          {!result ? (
            <p className="mt-2 text-xs text-[#899791]">No import run yet in this session.</p>
          ) : (
            <div className="mt-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Total rows', result.rows_total],
                  ['New cases', result.rows_new],
                  ['Updated', result.rows_updated],
                  ['Below threshold', result.rows_below_threshold],
                  ['Rejected', result.rows_rejected],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#edf1ef] bg-[#f8fbf9] p-3">
                    <div className="text-[10px] text-[#8a9a94]">{label}</div>
                    <div className="mt-1 font-serif text-[18px] font-semibold text-[#18342e]">{value}</div>
                  </div>
                ))}
                <div className="rounded-xl border border-[#edf1ef] bg-[#f8fbf9] p-3">
                  <div className="text-[10px] text-[#8a9a94]">Import ID</div>
                  <div className="mt-1 font-mono text-[11px] font-semibold text-[#18342e]">{result.import_id}</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="rounded-xl border border-[#fae6e0] bg-[#fffaf8] p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#a55342]">
                    <AlertTriangle size={13} /> Invalid-row report ({result.errors.length})
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {result.errors.map((rowErr, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-[#843627]">
                        <FileCheck size={12} className="mt-0.5 shrink-0" />
                        <span>Row {rowErr.row}: {rowErr.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
