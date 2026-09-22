"""Commander strategy layer: aggregate-only heatmaps and cohesion alerts (k-anonymity enforced)."""

from typing import List
from fastapi import APIRouter, Depends
from app.models.schemas import CohortHeatmapItem
from app.ml.synthetic_generator import cohort_manager
from app.ml.cohesion_analyzer import cohesion_analyzer
from app.ml.hr_risk_model import hr_risk_engine
from app.core.k_anonymity import enforce_k_anonymity_cohort, apply_complementary_suppression
from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles

router = APIRouter(prefix="/v1/command", tags=["Commander Strategy Layer"])

# Methodology (every number traceable; synthetic demo data, see ModelCard):
# - avg_fatigue_index = mean over unit members of (5 - mood_avg_7d) / 4 * 10.
# - risk_distribution = member counts by engine band per unit
#   (low: 0-1, moderate: 2, elevated: 3, critical: 4).
# - workload_score = mean night_duty_hours_28d / 160.
# - leave_denial_rate / duty_variance = unit means of the HR indicators.
# - Company cells apportion unit totals by fixed demonstration percentages;
#   the detached outpost (n=14) is a fixed demonstration fixture exercising
#   the k-anonymity suppression path.
UNIT_METHODOLOGY = (
    "Unit means of member observations (fatigue from mood, band counts from "
    "the risk engine); company cells apportion unit totals by fixed "
    "demonstration percentages. Synthetic demo data."
)

COMPANY_SPLITS = [
    ("Alpha Coy", 0.40),
    ("Bravo Coy", 0.35),
    ("Charlie Coy", 0.20),
]


def _unit_aggregates(df, unit_name: str) -> dict:
    members = df[df["unit_name"] == unit_name]
    n = len(members)
    fatigue = float(((5.0 - members["mood_avg_7d"]) / 4.0 * 10.0).mean())
    bands = {"low": 0, "moderate": 0, "elevated": 0, "critical": 0}
    baseline_ctx = members.iloc[0]["force_type"] if n else "counter_insurgency"
    baseline = cohort_manager.cohort_stats.get(baseline_ctx, {"median": 0.50, "mad": 0.12, "count": n})
    for _, row in members.iterrows():
        rec = row.to_dict()
        _, band, _, _ = hr_risk_engine.predict_individual_risk(rec, baseline)
        if band <= 1:
            bands["low"] += 1
        elif band == 2:
            bands["moderate"] += 1
        elif band == 3:
            bands["elevated"] += 1
        else:
            bands["critical"] += 1
    return {
        "n": n,
        "avg_fatigue": round(fatigue, 1),
        "bands": bands,
        "workload": round(float((members["night_duty_hours_28d"] / 160.0).mean()), 2),
        "force_type": baseline_ctx,
    }


def _recommendation(avg_fatigue: float) -> str:
    if avg_fatigue > 6.5:
        return "High Priority: Plan 14-day Rest Stand-down Cycle"
    if avg_fatigue > 4.5:
        return "Moderate Fatigue: Monitor shift rotation variance"
    return "Standard Routine Deployment"


@router.get("/heatmap", response_model=List[CohortHeatmapItem])
def get_cohort_heatmaps(
    simulate_privacy_violation: bool = False,
    user: dict = Depends(require_roles("Z1_COMMANDER")),
):
    df = cohort_manager.personnel_df
    if df.empty:
        return []

    raw_items = []
    for unit in sorted(df["unit_name"].unique()):
        agg = _unit_aggregates(df, unit)
        for coy_name, pct in COMPANY_SPLITS:
            coy_n = int(round(agg["n"] * pct))
            dist = {k: int(round(v * pct)) for k, v in agg["bands"].items()}
            metrics = {
                "parent_unit": unit,
                "force_type": unit.split()[0],
                "avg_fatigue_index": agg["avg_fatigue"],
                "risk_distribution": dist,
                "workload_score": agg["workload"],
                "rotation_recommendation": _recommendation(agg["avg_fatigue"]),
                "methodology": UNIT_METHODOLOGY,
                "demonstration_fixture": False,
            }
            raw_items.append(enforce_k_anonymity_cohort(
                cohort_name=f"{unit} - {coy_name}",
                total_personnel=coy_n,
                metrics=metrics,
            ))
        # Fixed small-cohort fixture exercising suppression (labeled as such).
        raw_items.append(enforce_k_anonymity_cohort(
            cohort_name=f"{unit} - Detached Outpost (Small Platoon)",
            total_personnel=14,
            metrics={
                "parent_unit": unit,
                "force_type": unit.split()[0],
                "avg_fatigue_index": agg["avg_fatigue"],
                "risk_distribution": dict(agg["bands"]),
                "workload_score": agg["workload"],
                "rotation_recommendation": "Cohort Redacted (k-anonymity guarantee)",
                "methodology": UNIT_METHODOLOGY,
                "demonstration_fixture": True,
            },
        ))

    processed_items = apply_complementary_suppression("Command General", raw_items)

    audit_ledger.append_log(
        actor_role="commander",
        actor_id=user["sub"],
        action="AGGREGATE_HEATMAP_VIEWED",
        metadata={"total_cohorts": len(processed_items)}
    )

    response_list = []
    for item in processed_items:
        response_list.append(CohortHeatmapItem(
            cohort_name=item["cohort_name"],
            parent_unit=item.get("parent_unit", "Base Unit"),
            force_type=item.get("force_type", "CAPF"),
            total_personnel=item["total_personnel"],
            is_suppressed=item.get("is_suppressed", False),
            is_complementary_suppressed=item.get("is_complementary_suppressed", False),
            suppression_reason=item.get("suppression_reason"),
            avg_fatigue_index=item.get("avg_fatigue_index"),
            risk_distribution=item.get("risk_distribution"),
            workload_score=item.get("workload_score"),
            rotation_recommendation=item.get("rotation_recommendation"),
            methodology=item.get("methodology"),
            demonstration_fixture=item.get("demonstration_fixture", False),
        ))

    return response_list

@router.get("/cohesion-anomalies")
def get_cohesion_anomalies(user: dict = Depends(require_roles("Z1_COMMANDER"))):
    df = cohort_manager.personnel_df
    if df.empty:
        return []

    sub_units = cohesion_analyzer.analyze_sub_units(df)
    alerts = [s for s in sub_units if s.get("is_climate_alert")]

    audit_ledger.append_log(
        actor_role="commander",
        actor_id=user["sub"],
        action="COHESION_ANOMALIES_VIEWED",
        metadata={"active_alerts": len(alerts)}
    )

    return alerts


@router.get("/cohort-statistics")
def get_cohort_statistics(user: dict = Depends(require_roles("Z1_COMMANDER", "Z1_WELFARE_OFFICER", "Z0_PERSONNEL", "AUDITOR"))):
    df = cohort_manager.personnel_df
    if df.empty:
        return {
            "total_personnel": 0,
            "unit_name": "CRPF 144 Bn",
            "force_type_distribution": {}
        }

    force_type_counts = df["force_type"].value_counts().to_dict()

    audit_ledger.append_log(
        actor_role="commander",
        actor_id=user["sub"],
        action="COHORT_STATISTICS_VIEWED",
        metadata={"total_personnel": len(df)}
    )

    return {
        "total_personnel": len(df),
        "unit_name": "CRPF 144 Bn",
        "force_type_distribution": force_type_counts
    }
