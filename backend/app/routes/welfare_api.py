"""
Welfare Officer Dashboard API (Z1 Welfare Core)
Handles:
- Case list retrieval (only flagged personnel, no raw text, only whitelisted reason codes)
- Single case inspection (logged into immutable audit chain on every view)
- Welfare intervention logging (counseling, peer buddy nudge, stand-down, medical leave)
- Weak-label feedback loop (officer labels 'true_concern' vs 'false_alarm' for model retraining)
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import (
    WelfareCaseSummary,
    InterventionCreate,
    LabelFeedbackCreate
)
from app.routes.device_api import ACTIVE_CASES
from app.core.audit_chain import audit_ledger
from app.core.reason_codes import get_reason_metadata

router = APIRouter(prefix="/v1/welfare", tags=["Welfare Officer Core"])

@router.get("/cases", response_model=List[WelfareCaseSummary])
def list_cases(
    tier: Optional[str] = None,
    status: Optional[str] = None,
    officer_id: str = "WO_7742"
):
    """
    Retrieves flagged cases.
    Every call to this endpoint is logged into the audit ledger.
    """
    results = []
    for c in ACTIVE_CASES.values():
        if tier and c["tier"] != tier:
            continue
        if status and c["status"] != status:
            continue
        
        results.append(WelfareCaseSummary(
            case_id=c["case_id"],
            pseudonym_id=c["pseudonym_id"],
            tier=c["tier"],
            origin=c["origin"],
            reason_codes=c["reason_codes"],
            opened_at=c["opened_at"],
            closed_at=c["closed_at"],
            status=c["status"],
            unit_context=c["unit_context"],
            h_band=c["h_band"],
            has_acute_marker=c["has_acute_marker"],
            officer_label=c.get("officer_label"),
            interventions_count=len(c.get("interventions", []))
        ))

    # Audit log entry for case queue query
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=officer_id,
        action="CASE_LIST_QUERIED",
        metadata={"total_returned": len(results), "filter_tier": tier}
    )

    return sorted(results, key=lambda x: (x.tier == "critical", x.tier == "elevated"), reverse=True)

@router.get("/cases/{case_id}")
def get_case_detail(case_id: str, officer_id: str = "WO_7742"):
    """
    Retrieves full case details along with reason code descriptions.
    Enforces audit logging.
    """
    case = ACTIVE_CASES.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    # Audit log entry for viewing single case
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=officer_id,
        action="CASE_DETAIL_ACCESSED",
        case_id=case_id,
        pseudonym_id=case["pseudonym_id"],
        metadata={"tier": case["tier"], "h_band": case["h_band"]}
    )

    reason_meta = get_reason_metadata(case["reason_codes"])

    return {
        "case": case,
        "reason_metadata": [r.dict() for r in reason_meta],
        "interventions": case.get("interventions", [])
    }

@router.post("/cases/{case_id}/interventions")
def log_intervention(case_id: str, payload: InterventionCreate):
    """
    Logs an intervention (e.g. Peer Buddy Nudge, Counseling, Duty Stand-down).
    """
    case = ACTIVE_CASES.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    intervention_id = f"INT-{uuid.uuid4().hex[:6].upper()}"
    intervention_record = {
        "intervention_id": intervention_id,
        "case_id": case_id,
        "kind": payload.kind,
        "performed_by_role": payload.performed_by_role,
        "officer_id": payload.officer_id,
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "notes_sanitized": payload.notes_sanitized
    }

    if "interventions" not in case:
        case["interventions"] = []
    case["interventions"].append(intervention_record)
    case["status"] = "intervention_active"

    # Log in audit ledger
    audit_ledger.append_log(
        actor_role=payload.performed_by_role,
        actor_id=payload.officer_id,
        action="INTERVENTION_LOGGED",
        case_id=case_id,
        pseudonym_id=case["pseudonym_id"],
        metadata={"intervention_kind": payload.kind, "intervention_id": intervention_id}
    )

    return {"status": "recorded", "intervention": intervention_record}

@router.post("/cases/{case_id}/label")
def submit_label_feedback(case_id: str, payload: LabelFeedbackCreate):
    """
    Weak-label feedback loop.
    Enables officers to mark 'true_concern', 'false_alarm', or 'inconclusive'.
    This critical loop produces the dataset to iteratively calibrate the risk engine.
    """
    case = ACTIVE_CASES.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    case["officer_label"] = payload.label

    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=payload.officer_id,
        action="WEAK_LABEL_SUBMITTED",
        case_id=case_id,
        pseudonym_id=case["pseudonym_id"],
        metadata={"label": payload.label, "feedback": payload.feedback_notes}
    )

    return {"status": "label_saved", "case_id": case_id, "officer_label": payload.label}
