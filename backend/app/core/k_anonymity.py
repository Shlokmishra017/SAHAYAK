"""k-anonymity (n >= 20) with complementary cell suppression."""

from typing import Dict, List, Any

K_MIN_THRESHOLD = 20

def enforce_k_anonymity_cohort(
    cohort_name: str,
    total_personnel: int,
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
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
            "rest_ratio": None,
            # Privacy-safe passthrough: unit identity and methodology notes
            # contain no individual data.
            "parent_unit": metrics.get("parent_unit"),
            "force_type": metrics.get("force_type"),
            "workload_score": None,
            "rotation_recommendation": "Cohort Redacted (k-anonymity guarantee)",
            "methodology": metrics.get("methodology"),
            "demonstration_fixture": metrics.get("demonstration_fixture", False),
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
    # With exactly one suppressed cell, also suppress the smallest visible one
    # so the hidden cell can't be derived by subtracting from the parent total.
    suppressed_count = sum(1 for u in sub_units if u.get("is_suppressed", False))

    if suppressed_count == 1:
        unsuppressed = [u for u in sub_units if not u.get("is_suppressed", False)]
        if unsuppressed:
            smallest_valid = min(unsuppressed, key=lambda x: x.get("total_personnel", 9999))
            for u in sub_units:
                if u.get("cohort_name") == smallest_valid.get("cohort_name"):
                    u["is_suppressed"] = True
                    u["is_complementary_suppressed"] = True
                    u["suppression_reason"] = "Complementary Suppression Active: Redacted to prevent algebraic deduction of companion small cohort."
                    u["risk_distribution"] = {"low": None, "moderate": None, "elevated": None, "critical": None}
                    u["avg_fatigue_index"] = None
                    
    return sub_units
