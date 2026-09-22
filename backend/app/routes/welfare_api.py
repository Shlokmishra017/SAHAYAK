"""Welfare officer triage: flagged-case queue, case detail, interventions, officer labels."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.schemas import (
    WelfareCaseSummary,
    InterventionCreate,
    InterventionOutcome,
    CaseStatusChange,
    LabelFeedbackCreate,
    CASE_STATUS_TRANSITIONS,
    INTERVENTION_OUTCOMES,
)
from app.core.audit_chain import audit_ledger
from app.core.reason_codes import get_reason_metadata
from app.core.auth import require_roles
from app.core.database import CaseRecord, InterventionRecord, case_dict, get_db, list_cases as db_list_cases

router = APIRouter(prefix="/v1/welfare", tags=["Welfare Officer Core"])
limiter = Limiter(key_func=get_remote_address)

@router.get("/cases", response_model=List[WelfareCaseSummary])
@limiter.limit("60/minute")
def list_cases(
    request: Request,
    tier: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
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
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")

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

    from app.ml.trajectory import build_trajectory
    history = list(
        db.scalars(select(CaseRecord).where(CaseRecord.pseudonym_id == case.pseudonym_id))
    )

    return {
        "case": case_data,
        "reason_metadata": [r.model_dump() for r in reason_meta],
        "interventions": case_data["interventions"],
        "trajectory": build_trajectory(history),
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
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")
    if case.status in ("closed", "declined"):
        raise HTTPException(
            status_code=409,
            detail=f"Case is {case.status}; terminal cases accept no new interventions.",
        )

    intervention_id = f"INT-{uuid.uuid4().hex[:6].upper()}"
    intervention_record = {
        "intervention_id": intervention_id,
        "case_id": case_id,
        "kind": payload.kind,
        "performed_by_role": "welfare_officer",
        "officer_id": user["sub"],
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "notes_sanitized": payload.notes_sanitized,
        "target_concern": payload.target_concern,
        "follow_up_date": payload.follow_up_date,
    }

    db.add(InterventionRecord(**intervention_record))
    case.status = "intervention_active"
    db.commit()

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


@router.patch("/cases/{case_id}/status")
@limiter.limit("30/minute")
def change_case_status(
    request: Request,
    case_id: str,
    payload: CaseStatusChange,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    case = db.get(CaseRecord, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found.")
    allowed = CASE_STATUS_TRANSITIONS.get(case.status, [])
    if payload.status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Transition {case.status} → {payload.status} is not allowed.",
        )
    previous = case.status
    case.status = payload.status
    if payload.status == "closed":
        case.closed_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="CASE_STATUS_CHANGED",
        case_id=case_id,
        pseudonym_id=case.pseudonym_id,
        metadata={"from": previous, "to": payload.status},
    )
    return {"status": case.status, "case_id": case_id, "previous": previous}


@router.post("/cases/{case_id}/interventions/{intervention_id}/outcome")
@limiter.limit("30/minute")
def record_intervention_outcome(
    request: Request,
    case_id: str,
    intervention_id: str,
    payload: InterventionOutcome,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    if payload.outcome not in INTERVENTION_OUTCOMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown outcome. Allowed: {', '.join(INTERVENTION_OUTCOMES)}.",
        )
    if payload.outcome_score is not None and not 1 <= payload.outcome_score <= 5:
        raise HTTPException(status_code=400, detail="outcome_score must be 1-5.")
    record = db.get(InterventionRecord, intervention_id)
    if not record or record.case_id != case_id:
        raise HTTPException(status_code=404, detail="Intervention not found for this case.")
    case = db.get(CaseRecord, case_id)
    if not case or case.status in ("closed", "declined"):
        raise HTTPException(status_code=409, detail="Terminal cases accept no new outcomes.")

    record.outcome = payload.outcome
    record.outcome_score = payload.outcome_score
    if payload.notes_sanitized:
        record.notes_sanitized = payload.notes_sanitized

    # Outcome drives the next case state: continued concern stays in the
    # follow-up loop, escalation moves up, otherwise the active intervention
    # continues until an officer explicitly closes the case.
    if payload.outcome == "needs_follow_up":
        case.status = "follow_up_due"
    elif payload.outcome == "escalated":
        case.status = "escalated"
    db.commit()

    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="INTERVENTION_OUTCOME_RECORDED",
        case_id=case_id,
        pseudonym_id=case.pseudonym_id,
        metadata={
            "intervention_id": intervention_id,
            "outcome": payload.outcome,
            "outcome_score": payload.outcome_score,
        },
    )
    return {
        "status": "outcome_recorded",
        "intervention_id": intervention_id,
        "outcome": payload.outcome,
        "case_status": case.status,
    }


@router.get("/interventions/recent")
@limiter.limit("60/minute")
def recent_interventions(
    request: Request,
    limit: int = 20,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    rows = list(
        db.scalars(select(InterventionRecord).order_by(InterventionRecord.performed_at.desc()).limit(limit))
    )
    case_ids = {r.case_id for r in rows}
    cases = {c.case_id: c for c in db.scalars(
        select(CaseRecord).where(CaseRecord.case_id.in_(case_ids)))} if case_ids else {}
    return [
        {
            "intervention_id": r.intervention_id,
            "case_id": r.case_id,
            "kind": r.kind,
            "performed_by_role": r.performed_by_role,
            "officer_id": r.officer_id,
            "performed_at": r.performed_at,
            "notes_sanitized": r.notes_sanitized,
            "target_concern": r.target_concern,
            "follow_up_date": r.follow_up_date,
            "outcome": r.outcome,
            "outcome_score": r.outcome_score,
            "case_tier": cases[r.case_id].tier if r.case_id in cases else None,
            "case_status": cases[r.case_id].status if r.case_id in cases else None,
        }
        for r in rows
    ]
