"""Deterministic, clearly labeled demo dataset (plan Task 9).

Covers: emerging risk, rising risk, stable low risk, critical risk,
post-intervention improvement, persistent concern, insufficient history,
plus small-cohort suppression (heatmap outpost fixture, see command_api).

Usage (from backend/):
    python seed_demo.py            # reset + seed the demo set (idempotent)
    python seed_demo.py --reset-only

Safety: refuses to run unless DEMO_MODE=true, so demo data is never mixed
with production data. Reset deletes CASE-DEMO-* cases, their interventions
and alerts; audit events are retained per docs/DataRetention.md.
"""

import argparse
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

if os.getenv("DEMO_MODE", "true").lower() != "true":
    sys.exit("Refusing to seed demo data with DEMO_MODE != true (production safety).")

# Test/dev custodian env so identity registration works standalone.
os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

from sqlalchemy import select  # noqa: E402

from app.core.audit_chain import audit_ledger  # noqa: E402
from app.core.database import (  # noqa: E402
    AlertRecord,
    CaseRecord,
    IdentityRegistry,
    InterventionRecord,
    SessionLocal,
    init_db,
)
from app.core.security import IdentityBroker, RealIdentityProfile  # noqa: E402


def demo_pseudo(key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "sahayak-demo:" + key))


IDENTITIES = [
    ("emerging", "CAPF-D00001", "Demo Emerging", "Constable", "CRPF 144 Bn (CI Ops)"),
    ("rising", "CAPF-D00002", "Demo Rising", "Constable", "BSF 92 Bn (Forward Post)"),
    ("stable", "CAPF-D00003", "Demo Stable", "Head Constable", "CISF Plant Security Unit"),
    ("critical", "CAPF-D00004", "Demo Critical", "Constable", "CRPF 144 Bn (CI Ops)"),
    ("persistent", "CAPF-D00005", "Demo Persistent", "Constable", "RAF 108 Bn (Rapid Action)"),
]

CASES = [
    # key, case_id, scenario, tier, status, band, acute, opened_at, codes
    ("emerging", "CASE-DEMO-EMERG", "emerging + insufficient history",
     "emerging", "open", 2, False, "2026-09-18T09:00:00Z",
     ["RC_SOMATIC_FATIGUE_CLUSTER", "RC_MOOD_TRAJECTORY_DROP"]),
    ("rising", "CASE-DEMO-RISE1", "rising (earlier point)",
     "emerging", "in_review", 2, False, "2026-09-05T09:00:00Z",
     ["RC_SUSTAINED_DEPLOYMENT"]),
    ("rising", "CASE-DEMO-RISE2", "rising (later point)",
     "elevated", "open", 3, False, "2026-09-16T09:00:00Z",
     ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER"]),
    ("stable", "CASE-DEMO-STABLE", "stable low + post-intervention improvement",
     "elevated", "closed", 3, False, "2026-08-20T09:00:00Z",
     ["RC_NIGHT_SHIFT_OVERLOAD"]),
    ("critical", "CASE-DEMO-CRIT", "critical risk",
     "critical", "open", 4, True, "2026-09-19T09:00:00Z",
     ["RC_ACUTE_DISTRESS_MARKER", "RC_SUSTAINED_DEPLOYMENT", "RC_SLEEP_DEGRADATION_TREND"]),
    ("persistent", "CASE-DEMO-PERSIST", "persistent concern",
     "elevated", "follow_up_due", 3, False, "2026-09-08T09:00:00Z",
     ["RC_POST_LEAVE_VULNERABILITY", "RC_DENIED_LEAVE_CLUSTER"]),
]

INTERVENTIONS = [
    # int_id, case_id, kind, concern, follow_up, outcome, score, notes
    ("INT-DEMO-STABLE1", "CASE-DEMO-STABLE", "operational_rest_rotation",
     "sleep_fatigue", "2026-09-03", "improved", 4,
     "72h rest rotation completed; sleep restored, mood steady."),
    ("INT-DEMO-PERSIST1", "CASE-DEMO-PERSIST", "welfare_counseling",
     "leave_separation", "2026-09-25", "needs_follow_up", 2,
     "Leave review pending; fatigue persists, follow-up scheduled."),
    ("INT-DEMO-RISE1", "CASE-DEMO-RISE2", "peer_buddy_nudge",
     "workload_tempo", "2026-09-24", None, None,
     "Peer buddy assigned for daily check-in."),
]


def reset_demo(db) -> dict:
    removed = {"cases": 0, "interventions": 0, "alerts": 0}
    demo_cases = list(db.scalars(select(CaseRecord).where(CaseRecord.case_id.like("CASE-DEMO-%"))))
    demo_ids = [c.case_id for c in demo_cases]
    if demo_ids:
        for item in db.scalars(select(InterventionRecord).where(
                InterventionRecord.case_id.in_(demo_ids))):
            db.delete(item)
            removed["interventions"] += 1
        for alert in db.scalars(select(AlertRecord).where(AlertRecord.case_id.in_(demo_ids))):
            db.delete(alert)
            removed["alerts"] += 1
        for case in demo_cases:
            db.delete(case)
            removed["cases"] += 1
    # Demo identities are stable registry rows keyed by fixed pseudonyms.
    for key, _, _, _, _ in IDENTITIES:
        row = db.get(IdentityRegistry, demo_pseudo(key))
        if row:
            db.delete(row)
    db.commit()
    return removed


def seed_demo(db) -> dict:
    pseudos = {key: demo_pseudo(key) for key, _, _, _, _ in IDENTITIES}
    for key, svc, name, rank, unit in IDENTITIES:
        IdentityBroker.register_personnel(RealIdentityProfile(
            pseudonym_id=pseudos[key], service_number=svc, full_name=name,
            rank=rank, unit=unit, blood_group="O+",
            emergency_contact_phone="+91 9000000000",
            emergency_contact_name=f"Kin of {name}",
            base_location="Sector HQ"))

    units = {k: u for k, _, _, _, u in IDENTITIES}
    for key, case_id, scenario, tier, status, band, acute, opened, codes in CASES:
        db.add(CaseRecord(
            case_id=case_id, pseudonym_id=pseudos[key], tier=tier,
            origin="demo_seed", reason_codes=codes, opened_at=opened,
            closed_at="2026-09-17T09:00:00Z" if status == "closed" else None,
            status=status, unit_context=units[key], h_band=band,
            has_acute_marker=acute))
        audit_ledger.append_log(
            actor_role="system_seed", actor_id="demo_seed", action="DEMO_CASE_SEEDED",
            case_id=case_id, pseudonym_id=pseudos[key],
            metadata={"scenario": scenario, "tier": tier})
    for int_id, case_id, kind, concern, follow_up, outcome, score, notes in INTERVENTIONS:
        db.add(InterventionRecord(
            intervention_id=int_id, case_id=case_id, kind=kind,
            performed_by_role="welfare_officer", officer_id="WO-7742",
            performed_at="2026-09-16T10:00:00Z", notes_sanitized=notes,
            target_concern=concern, follow_up_date=follow_up,
            outcome=outcome, outcome_score=score))
    db.add(AlertRecord(
        alert_id="ALERT-DEMO-CRIT", case_id="CASE-DEMO-CRIT",
        pseudonym_id=pseudos["critical"], tier="critical",
        reason="RC_ACUTE_DISTRESS_MARKER", channel="internal",
        status="recorded",
        delivery_note="demo record: SMTP not configured; internal record only",
        created_at="2026-09-19T09:05:00Z"))
    db.commit()
    return {"cases": len(CASES), "interventions": len(INTERVENTIONS), "alerts": 1}


def main():
    parser = argparse.ArgumentParser(description="Seed/reset the deterministic demo dataset")
    parser.add_argument("--reset-only", action="store_true")
    args = parser.parse_args()
    init_db()
    with SessionLocal() as db:
        removed = reset_demo(db)
        print(f"reset-demo: removed {removed}")
        if args.reset_only:
            return
        added = seed_demo(db)
        print(f"seed-demo: added {added} (scenarios: emerging, rising, stable-low, "
              "critical, post-intervention improvement, persistent concern, "
              "insufficient history; small-cohort via heatmap outpost fixture)")


if __name__ == "__main__":
    main()
