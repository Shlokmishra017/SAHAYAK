"""
Reason Code Catalog
Whitelisted vocabulary of closed reason codes for explainable risk attribution.
Zero free-text or raw psychological descriptions are permitted across the network.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel

class ReasonCodeDefinition(BaseModel):
    code: str
    category: str  # "operational" | "wellness_trend" | "acute_safety" | "unit_climate"
    title: str
    description: str
    severity_weight: float
    recommended_action: str

REASON_CODES: Dict[str, ReasonCodeDefinition] = {
    "RC_SUSTAINED_DEPLOYMENT": ReasonCodeDefinition(
        code="RC_SUSTAINED_DEPLOYMENT",
        category="operational",
        title="Prolonged High-Alert Deployment",
        description="Continuous active deployment exceeding 60 consecutive days without operational stand-down.",
        severity_weight=0.75,
        recommended_action="Schedule mandatory 72-hour operational rest rotation."
    ),
    "RC_DENIED_LEAVE_CLUSTER": ReasonCodeDefinition(
        code="RC_DENIED_LEAVE_CLUSTER",
        category="operational",
        title="Multiple Denied Leave Applications",
        description="High ratio of rejected leave applications within trailing 12 months (>50% denial rate).",
        severity_weight=0.85,
        recommended_action="Expedited compassionate leave review by Unit Welfare Board."
    ),
    "RC_POST_LEAVE_VULNERABILITY": ReasonCodeDefinition(
        code="RC_POST_LEAVE_VULNERABILITY",
        category="operational",
        title="Post-Leave Re-entry Vulnerability Window",
        description="High stress signature detected during critical 7-21 days following return from leave.",
        severity_weight=0.80,
        recommended_action="Informal buddy check-in and family liaison officer follow-up."
    ),
    "RC_NIGHT_SHIFT_OVERLOAD": ReasonCodeDefinition(
        code="RC_NIGHT_SHIFT_OVERLOAD",
        category="operational",
        title="Excessive Night Duty & Shift Variance",
        description="Night duty hours exceeding 120 hours in 28 days with irregular circadian rotation.",
        severity_weight=0.65,
        recommended_action="Roster adjustment to regularize sleep cycles."
    ),
    "RC_FREQUENT_TRANSFER": ReasonCodeDefinition(
        code="RC_FREQUENT_TRANSFER",
        category="operational",
        title="Frequent Relocation Stagnation",
        description="3 or more field transfers in 36 months combined with non-colocated family status.",
        severity_weight=0.60,
        recommended_action="Assess family accommodation eligibility and stability posting."
    ),
    "RC_SLEEP_DEGRADATION_TREND": ReasonCodeDefinition(
        code="RC_SLEEP_DEGRADATION_TREND",
        category="wellness_trend",
        title="Sustained Sleep Fragmentation Trend",
        description="Exponential moving average of sleep duration dropped below 4.5 hours for 5+ consecutive days.",
        severity_weight=0.70,
        recommended_action="Fatigue mitigation protocol & voluntary sleep hygiene consultation."
    ),
    "RC_MOOD_TRAJECTORY_DROP": ReasonCodeDefinition(
        code="RC_MOOD_TRAJECTORY_DROP",
        category="wellness_trend",
        title="Persistent Downward Wellness Trajectory",
        description="Consistent negative slope in 14-day subjective well-being check-ins.",
        severity_weight=0.75,
        recommended_action="Peer buddy check-in or informal coffee connect with Unit Welfare Officer."
    ),
    "RC_SOMATIC_FATIGUE_CLUSTER": ReasonCodeDefinition(
        code="RC_SOMATIC_FATIGUE_CLUSTER",
        category="wellness_trend",
        title="Chronic Somatic Exhaustion Pattern",
        description="Recurring markers of physical fatigue and cognitive drain over 10-day evaluation window.",
        severity_weight=0.65,
        recommended_action="Medical RMO review and physical conditioning adjustment."
    ),
    "RC_COHESION_FRICTION_ANOMALY": ReasonCodeDefinition(
        code="RC_COHESION_FRICTION_ANOMALY",
        category="unit_climate",
        title="Sub-Unit Climate Stress Anomaly",
        description="Elevated sub-unit grievance clustering and peer support isolation detected in cohort analytics.",
        severity_weight=0.70,
        recommended_action="Company Commander climate review and team-building exercise."
    ),
    "RC_ACUTE_DISTRESS_MARKER": ReasonCodeDefinition(
        code="RC_ACUTE_DISTRESS_MARKER",
        category="acute_safety",
        title="Acute Emotional Distress Signal",
        description="High urgency stress markers detected. Fast-track safety protocol active.",
        severity_weight=1.00,
        recommended_action="Immediate Tele-MANAS (14416) connection and prompt Welfare Officer notification."
    ),
}

def validate_reason_codes(codes: List[str]) -> List[str]:
    """Ensures incoming codes strictly belong to the whitelisted vocabulary."""
    return [c for c in codes if c in REASON_CODES]

def get_reason_metadata(codes: List[str]) -> List[ReasonCodeDefinition]:
    """Returns detailed metadata for valid reason codes."""
    return [REASON_CODES[c] for c in codes if c in REASON_CODES]
