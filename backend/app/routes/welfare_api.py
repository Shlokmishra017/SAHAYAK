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
from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

router = APIRouter(prefix="/v1/welfare", tags=["Welfare Officer Core"])
limiter = Limiter(key_func=get_remote_address)
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.schemas import (
    WelfareCaseSummary,
    InterventionCreate,
    LabelFeedbackCreate
)
from app.core.audit_chain import audit_ledger
from app.core.reason_codes import get_reason_metadata
from app.core.auth import require_roles
from app.core.database import CaseRecord, InterventionRecord, case_dict, get_db, list_cases as db_list_cases

router = APIRouter(prefix="/v1/welfare", tags=["Welfare Officer Core"])

@router.get("/cases", response_model=List[WelfareCaseSummary])
@limiter.limit("60/minute")
def list_cases(
    request: Request,
    tier: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    """
    Retrieves flagged cases.
    Every call to this endpoint is logged into the audit ledger.
    """
    # Pre-fetch intervention counts in a single query to eliminate N+1 overhead
    counts_stmt = (
        select(InterventionRecord.case_id, func.count(InterventionRecord.intervention_id))
        .group_by(InterventionRecord.case_id)
    )
    intervention_counts = dict(db.execute(counts_stmt).all())

    results = []
    for c in db_list_cases(db):
        if tier and c.tier != tier:
            continue
        if status and c.status != status:
            continue
        
        results.append(WelfareCaseSummary(
            case_id=c.case_id,
            pseudonym_id=c.pseudonym_id,
            tier=c.tier,
            origin=c.origin,
            reason_codes=c.reason_codes,
            opened_at=c.opened_at,
            closed_at=c.closed_at,
            status=c.status,
            unit_context=c.unit_context,
            h_band=c.h_band,
            has_acute_marker=c.has_acute_marker,
            officer_label=c.officer_label,
            interventions_count=intervention_counts.get(c.case_id, 0)
        ))

    # Audit log entry for case queue query
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="CASE_LIST_QUERIED",
        metadata={"total_returned": len(results), "filter_tier": tier}
    )

    return sorted(results, key=lambda x: (x.tier == "critical", x.tier == "elevated"), reverse=True)

@router.get("/cases/{case_id}")
@limiter.limit("60/minute")
def get_case_detail(
    request: Request,
    case_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    """
    Retrieves full case details along with reason code descriptions.
    Enforces audit logging.
    """
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    # Audit log entry for viewing single case
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="CASE_DETAIL_ACCESSED",
        case_id=case_id,
        pseudonym_id=case.pseudonym_id,
        metadata={"tier": case.tier, "h_band": case.h_band}
    )

    case_data = case_dict(db, case)
    reason_meta = get_reason_metadata(case.reason_codes)

    return {
        "case": case_data,
        "reason_metadata": [r.dict() for r in reason_meta],
        "interventions": case_data["interventions"]
    }

@router.post("/cases/{case_id}/interventions")
@limiter.limit("30/minute")
def log_intervention(
    request: Request,
    case_id: str,
    payload: InterventionCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    """
    Logs an intervention (e.g. Peer Buddy Nudge, Counseling, Duty Stand-down).
    """
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    intervention_id = f"INT-{uuid.uuid4().hex[:6].upper()}"
    intervention_record = {
        "intervention_id": intervention_id,
        "case_id": case_id,
        "kind": payload.kind,
        "performed_by_role": "welfare_officer",
        "officer_id": user["sub"],
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "notes_sanitized": payload.notes_sanitized
    }

    db.add(InterventionRecord(**intervention_record))
    case.status = "intervention_active"
    db.commit()

    # Log in audit ledger
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="INTERVENTION_LOGGED",
        case_id=case_id,
        pseudonym_id=case.pseudonym_id,
        metadata={"intervention_kind": payload.kind, "intervention_id": intervention_id}
    )

    return {"status": "recorded", "intervention": intervention_record}

@router.post("/cases/{case_id}/label")
@limiter.limit("30/minute")
def submit_label_feedback(
    request: Request,
    case_id: str,
    payload: LabelFeedbackCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    """
    Weak-label feedback loop.
    Enables officers to mark 'true_concern', 'false_alarm', or 'inconclusive'.
    This critical loop produces the dataset to iteratively calibrate the risk engine.
    """
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

    case.officer_label = payload.label
    db.commit()

    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="WEAK_LABEL_SUBMITTED",
        case_id=case_id,
        pseudonym_id=case.pseudonym_id,
        metadata={"label": payload.label, "feedback": payload.feedback_notes}
    )

    return {"status": "label_saved", "case_id": case_id, "officer_label": payload.label}
