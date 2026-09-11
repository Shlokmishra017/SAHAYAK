"""
K-Anonymity & Complementary Cell Suppression Module
Ensures no commander dashboard view can be used to isolate an individual or infer
risk scores for small cohorts (minimum cohort size n >= 20).
"""

from typing import Dict, List, Any, Optional

K_MIN_THRESHOLD = 20

def enforce_k_anonymity_cohort(
    cohort_name: str,
    total_personnel: int,
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates cohort size against k=20 threshold.
    If total_personnel < 20, redacts statistical distributions.
    """
    if total_personnel < K_MIN_THRESHOLD:
        return {
            "cohort_name": cohort_name,
            "total_personnel": total_personnel,
            "is_suppressed": True,
            "suppression_reason": f"Privacy Rule Violation: Cohort size (n={total_personnel}) is below minimum threshold (k={K_MIN_THRESHOLD}). Aggregates redacted to protect personnel identity.",
            "risk_distribution": {
                "low": None,
                "moderate": None,
                "elevated": None,
                "critical": None
            },
            "avg_fatigue_index": None,
            "rest_ratio": None
        }
    
    return {
        "cohort_name": cohort_name,
        "total_personnel": total_personnel,
        "is_suppressed": False,
        "suppression_reason": None,
        **metrics
    }

def apply_complementary_suppression(
    parent_group: str,
    sub_units: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Applies complementary cell suppression:
    If exactly ONE sub-unit is suppressed (e.g. n=14 out of Company A),
    a second sub-unit (even if n>=20) must also be suppressed or aggregated
    to prevent deducing the suppressed cell by subtracting other cells from the parent total.
    """
    suppressed_count = sum(1 for u in sub_units if u.get("is_suppressed", False))
    
    # If exactly 1 unit is suppressed, suppress the smallest unsuppressed unit as complementary defense
    if suppressed_count == 1:
        unsuppressed = [u for u in sub_units if not u.get("is_suppressed", False)]
        if unsuppressed:
            # Sort by total_personnel ascending
            smallest_valid = min(unsuppressed, key=lambda x: x.get("total_personnel", 9999))
            for u in sub_units:
                if u.get("cohort_name") == smallest_valid.get("cohort_name"):
                    u["is_suppressed"] = True
                    u["is_complementary_suppressed"] = True
                    u["suppression_reason"] = "Complementary Suppression Active: Redacted to prevent algebraic deduction of companion small cohort."
                    u["risk_distribution"] = {"low": None, "moderate": None, "elevated": None, "critical": None}
                    u["avg_fatigue_index"] = None
                    
    return sub_units
