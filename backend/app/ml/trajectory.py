"""Risk trajectory from recorded case history (no fabricated history).

For a pseudonym, orders that person's cases by opened_at and maps tiers to
numeric levels (emerging=1, elevated=2, critical=3). Direction compares the
two most recent points; fewer than two points yields "insufficient_history".
Intervention activity is surfaced as context, not as a score change.
"""

from typing import Dict, List

TIER_LEVEL = {"emerging": 1, "elevated": 2, "critical": 3, "nominal": 0}


def build_trajectory(cases: List) -> Dict:
    points = []
    for c in sorted(cases, key=lambda x: x.opened_at or ""):
        points.append({
            "case_id": c.case_id,
            "as_of": c.opened_at,
            "tier": c.tier,
            "level": TIER_LEVEL.get(c.tier, 0),
            "status": c.status,
        })
    if len(points) < 2:
        return {
            "points": points,
            "trend": "insufficient_history",
            "previous_tier": None,
            "current_tier": points[-1]["tier"] if points else None,
            "note": "Fewer than two recorded assessments; no trend inferred.",
        }
    prev, curr = points[-2], points[-1]
    if curr["level"] > prev["level"]:
        trend = "rising"
    elif curr["level"] < prev["level"]:
        trend = "falling"
    else:
        trend = "stable"
    return {
        "points": points,
        "trend": trend,
        "previous_tier": prev["tier"],
        "current_tier": curr["tier"],
        "note": f"Based on {len(points)} recorded case assessments.",
    }
