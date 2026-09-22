import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, EyeOff, Award, Cpu, Lock, Globe, Users, BookOpen } from 'lucide-react';
import { PageIntro, Stat } from '../layout/PageIntro';
import { BackendErrorState, DemoModeBanner } from '../common/DemoModeBanner';
import {
  fetchCommanderHeatmap,
  fetchCohesionAnomalies,
  fetchCohortStatistics
} from '../../services/api';

export function TeamPulseView() {
  const [heatmap, setHeatmap] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [cohortStats, setCohortStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadData = async () => {
    try {
      setLoadError(null);
      const [hmData, anomData, statsData] = await Promise.all([
        fetchCommanderHeatmap(),
        fetchCohesionAnomalies(),
        fetchCohortStatistics()
      ]);
      setHeatmap(hmData || []);
      setAnomalies(anomData || []);
      setCohortStats(statsData || null);
    } catch (err) {
      console.error('Failed to load commander data:', err);
      setLoadError(err?.message || 'Commander data could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const unsuppressedCohorts = heatmap.filter((c) => !c.is_suppressed);
  const avgFatigue =
    unsuppressedCohorts.length > 0
      ? (
          unsuppressedCohorts.reduce((acc, curr) => acc + (curr.avg_fatigue_index || 0), 0) /
          unsuppressedCohorts.length
        ).toFixed(1)
      : '5.8';

  return (
    <>
      <DemoModeBanner />
      {loadError && (
        <div className="mb-4">
          <BackendErrorState message={loadError} onRetry={handleRefresh} />
        </div>
      )}
      <PageIntro
        eyebrow="Command Strategy & Force Readiness"
        title="Team pulse"
        description="Aggregate signals to help commanders care for teams without exposing individual identities."
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#d2e8db] bg-[#eaf5ef] px-3 py-2 text-[11px] font-bold text-[#286c58]">
              <Shield size={14} /> Small groups hidden for privacy
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-[#dfe8e3] bg-white text-[#557068] hover:bg-[#f8fbf9] transition-colors"
              title="Refresh strategic pulse"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {/* Command Zero-Stigmatization Privacy Banner */}
      <div className="mb-6 rounded-2xl border border-[#cbe4d5] bg-gradient-to-br from-[#f2f8f4] to-[#eaf4ee] p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#174c42] text-white">
            <Shield size={18} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d5c4b]">
                Command Zero-Stigmatization Boundary (Z2 Tier)
              </h3>
              <span className="rounded-full bg-[#d7ecdf] px-2.5 py-0.5 text-[10px] font-bold text-[#185544]">
                K-Anonymity (n≥5) Protected
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#3c6457]">
              <strong>Strict Privacy Guarantee:</strong> Individual jawan wellness files, personal names, and psychological records are strictly unavailable in this command view. Aggregated exclusively at company/cohort level for strategic troop rotation, deployment balancing, and rest-cycle planning.
            </p>
          </div>
        </div>
      </div>

      {/* Why Sahayak — Key Differentiators for Command (Task 5) */}
      <div className="mb-6 rounded-2xl border border-[#d2e8db] bg-gradient-to-br from-[#f2f8f4] to-[#eaf4ee] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#174c42] text-white">
            <Award size={18} />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d5c4b]">Why Sahayak — Command Differentiators</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-[11px]">
              <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                <Shield className="shrink-0 mt-0.5 size-4 text-[#286c58]" />
                <div>
                  <div className="font-semibold text-[#1d5c4b]">Aggregate Only</div>
                  <div className="text-[#3c6457]">No individual profiles — cohort-level insights only</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                <Cpu className="shrink-0 mt-0.5 size-4 text-[#286c58]" />
                <div>
                  <div className="font-semibold text-[#1d5c4b]">Operational Context</div>
                  <div className="text-[#3c6457]">Fatigue calibrated to deployment, duty, leave patterns</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                <Users className="shrink-0 mt-0.5 size-4 text-[#286c58]" />
                <div>
                  <div className="font-semibold text-[#1d5c4b]">Welfare-Driven</div>
                  <div className="text-[#3c6457]">Outputs drive rest planning, not disciplinary action</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                <Lock className="shrink-0 mt-0.5 size-4 text-[#286c58]" />
                <div>
                  <div className="font-semibold text-[#1d5c4b]">Controlled Access</div>
                  <div className="text-[#3c6457]">Identity requires dual-custody break-glass</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                <Globe className="shrink-0 mt-0.5 size-4 text-[#286c58]" />
                <div>
                  <div className="font-semibold text-[#1d5c4b]">Field-Ready</div>
                  <div className="text-[#3c6457]">Offline-capable, mobile PWA, Hindi support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prototype Validation Disclaimer (Task 8) */}
      <div className="mb-6 rounded-xl border border-[#dfe8e3] bg-[#f7faf8] p-4">
        <div className="flex items-center gap-2 text-[11px] text-[#6c7d78]">
          <BookOpen size={14} className="text-[#8a9a94]" />
          <strong className="text-[#3c6457]">Prototype Validation Notice:</strong>
          <span>Command analytics are derived from synthetic longitudinal data for pipeline validation. Production deployment requires retraining and operational validation on authorized institutional datasets. Prototype validation ≠ operational validation.</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Total personnel monitored"
          value={cohortStats?.total_personnel ? `${cohortStats.total_personnel}` : '1,200'}
          detail="Within authorized sector"
          accent="text-[#397c68]"
        />
        <Stat
          label="Avg. unit fatigue index"
          value={`${avgFatigue} / 10`}
          detail="Sector baseline: 5.2"
          accent={Number(avgFatigue) > 6.5 ? 'text-[#bc684f]' : 'text-[#397c68]'}
        />
        <Stat
          label="Cohorts in safe range"
          value={`${unsuppressedCohorts.length} / ${heatmap.length}`}
          detail="1 privacy-suppressed cohort"
          accent="text-[#397c68]"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">
              Cohort Fatigue Heatmap
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78908a]">
              Sector units
            </span>
          </div>
          <p className="mb-4 text-[10px] leading-relaxed text-[#8a9a94]">
            Unit means of member observations; company cells apportion unit totals for demonstration.
            Cohorts under 20 personnel are redacted to protect identity.
          </p>

          <div className="space-y-4">
            {heatmap.map((cohort, idx) => {
              if (cohort.is_suppressed) {
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#fae6e0] bg-[#fffaf8] p-4 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#2d453e]">{cohort.cohort_name}</div>
                      <span className="inline-flex items-center gap-1 rounded bg-[#fae6e0] px-2 py-0.5 text-[10px] font-bold text-[#a55342]">
                        <EyeOff size={12} /> Redacted (n={cohort.total_personnel})
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#a55342]">
                      {cohort.suppression_reason ||
                        'Cohort size is below threshold (k=20). Aggregates redacted to protect personnel identity.'}
                    </p>
                  </div>
                );
              }

              const pct = Math.min(100, Math.round(((cohort.avg_fatigue_index || 5) / 10) * 100));
              const isHigh = cohort.avg_fatigue_index >= 7;

              return (
                <div key={idx} className="border-t border-[#edf1ef] pt-3.5 first:border-0 first:pt-0">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#2d453e]">{cohort.cohort_name}</span>
                      <span className="ml-2 text-[10px] text-[#78908a]">
                        (n={cohort.total_personnel})
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${
                        isHigh ? 'text-[#a55342]' : 'text-[#397c68]'
                      }`}
                    >
                      {cohort.avg_fatigue_index} / 10
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#edf3ef]">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isHigh ? 'bg-[#d47a58]' : 'bg-[#79ad92]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#78908a]">
                    <span>{cohort.rotation_recommendation}</span>
                    <span className="font-mono text-[10px]">
                      Workload: {Math.round((cohort.workload_score || 0.5) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-[20px] font-semibold text-[#25443b]">
                Climate & Cohesion Signals
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#78908a]">
                Operational friction
              </span>
            </div>

            <div className="space-y-4">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="rounded-xl border border-[#dfe8e3] bg-[#fbfdfb] p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#2d453e]">{anom.sub_unit_name}</div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        anom.is_climate_alert
                          ? 'bg-[#fae6e0] text-[#a55342]'
                          : 'bg-[#eaf5ef] text-[#27705c]'
                      }`}
                    >
                      {anom.is_climate_alert ? 'Friction Alert' : 'Normal'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[#f7faf8] p-2">
                      <div className="text-[10px] text-[#8a9a94]">Leave Denial</div>
                      <div className="mt-0.5 font-bold text-[#2d453e]">
                        {Math.round((anom.leave_denial_rate || 0) * 100)}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#f7faf8] p-2">
                      <div className="text-[10px] text-[#8a9a94]">Duty Variance</div>
                      <div className="mt-0.5 font-bold text-[#2d453e]">
                        {anom.duty_variance}h
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#f7faf8] p-2">
                      <div className="text-[10px] text-[#8a9a94]">Friction Score</div>
                      <div className="mt-0.5 font-bold text-[#a55342]">
                        {anom.climate_friction_score}
                      </div>
                    </div>
                  </div>

                  {anom.anomaly_indicators && anom.anomaly_indicators.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-[#edf1ef]">
                      {anom.anomaly_indicators.map((ind, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-[#fae6e0]/60 px-2 py-0.5 text-[10px] font-semibold text-[#a55342]"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {cohortStats?.force_type_distribution && (
            <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_30px_rgba(30,72,58,0.035)]">
              <h3 className="font-serif text-[18px] font-semibold text-[#25443b] mb-3">
                Deployment Sector Composition
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(cohortStats.force_type_distribution).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-[#edf1ef] bg-[#f8fbf9] p-3">
                    <div className="text-[10px] text-[#8a9a94] capitalize">
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 font-serif text-[18px] font-semibold text-[#18342e]">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
