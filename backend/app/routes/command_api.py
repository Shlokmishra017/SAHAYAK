"""
Commander Dashboard API (Z1 Command Layer)
Aggregated views only.
Guarantees:
- Enforces strict k-anonymity (n >= 20) with complementary suppression.
- ZERO access to individual scores or case lists (case:read denied for commander role).
- Provides operational fatigue heatmaps, cohesion climate anomaly indices, and rotation planning.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from app.models.schemas import CohortHeatmapItem
from app.ml.synthetic_generator import cohort_manager
from app.ml.cohesion_analyzer import cohesion_analyzer
from app.core.k_anonymity import enforce_k_anonymity_cohort, apply_complementary_suppression
from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles

router = APIRouter(prefix="/v1/command", tags=["Commander Strategy Layer"])

@router.get("/heatmap", response_model=List[CohortHeatmapItem])
def get_cohort_heatmaps(
    simulate_privacy_violation: bool = False,
    user: dict = Depends(require_roles("Z1_COMMANDER")),
):
    """
    Returns aggregated battalion/company heatmaps.
    Enforces k-anonymity (n >= 20) and complementary cell suppression.
    """
    df = cohort_manager.personnel_df
    if df.empty:
        return []

    # Analyze sub-units
    sub_units = cohesion_analyzer.analyze_sub_units(df)

    raw_items = []
    for s in sub_units:
        n = s["total_personnel"]
        # Calculate fatigue and risk buckets
        avg_fatigue = round(float(s["climate_friction_score"] * 10.0), 1)
        
        low_count = int(round(n * (1.0 - s["climate_friction_score"]) * 0.7))
        mod_count = int(round(n * 0.20))
        elev_count = int(round(n * (s["climate_friction_score"] * 0.6)))
        crit_count = max(0, n - (low_count + mod_count + elev_count))

        # Rotation recommendation
        recommendation = "Standard Routine Deployment"
        if avg_fatigue > 6.5:
            recommendation = "High Priority: Plan 14-day Rest Stand-down Cycle"
        elif avg_fatigue > 4.5:
            recommendation = "Moderate Fatigue: Monitor shift rotation variance"

        metrics = {
            "parent_unit": s["parent_unit"],
            "force_type": s["parent_unit"].split()[0],
            "avg_fatigue_index": avg_fatigue,
            "risk_distribution": {
                "low": low_count,
                "moderate": mod_count,
                "elevated": elev_count,
                "critical": crit_count
            },
            "workload_score": round(float(s["duty_variance"] / 30.0), 2),
            "rotation_recommendation": recommendation
        }

        # Apply k-anonymity gate
        enforced = enforce_k_anonymity_cohort(
            cohort_name=s["sub_unit_name"],
            total_personnel=n,
            metrics=metrics
        )
        raw_items.append(enforced)

    # Apply complementary suppression to protect small cohorts from algebraic subtraction
    processed_items = apply_complementary_suppression("Command General", raw_items)

    # Log access in audit chain
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
            rotation_recommendation=item.get("rotation_recommendation")
        ))

    return response_list

@router.get("/cohesion-anomalies")
def get_cohesion_anomalies(user: dict = Depends(require_roles("Z1_COMMANDER"))):
    """
    Surfaces cohort-level climate anomalies (toxic sub-unit friction, leave denial spikes)
    without naming ANY individual.
    """
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
    """
    Returns basic cohort statistics for frontend dashboard.
    Provides total personnel count and unit information.
    This endpoint is accessible to all roles for wellness overview statistics.
    """
    df = cohort_manager.personnel_df
    if df.empty:
        return {
            "total_personnel": 0,
            "unit_name": "CRPF 144 Bn",
            "force_type_distribution": {}
        }

    # Count personnel by force type
    force_type_counts = df["force_type"].value_counts().to_dict()

    # Log access in audit chain
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
