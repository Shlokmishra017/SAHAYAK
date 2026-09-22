"""Device edge gateway: attestation, risk-band pull, escalation/self-referral intake, erasure."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.schemas import (
    DeviceAttestationRequest,
    DeviceAttestationResponse,
    RiskBandResponse,
    EscalationPayload,
    SelfReferralRequest,
    ErasureRequest
)
from app.ml.synthetic_generator import cohort_manager
from app.ml.hr_risk_model import hr_risk_engine
from app.core.reason_codes import validate_reason_codes
from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles
from app.core.database import CaseRecord, IdempotencyRecord, get_db

router = APIRouter(prefix="/v1/device", tags=["Device Edge Gateway"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/attest", response_model=DeviceAttestationResponse)
@limiter.limit("10/minute")
def attest_device(request: Request, req: DeviceAttestationRequest, _user: dict = Depends(require_roles("Z0_PERSONNEL"))):
    token = f"attest_tok_{uuid.uuid4().hex[:16]}"
    return DeviceAttestationResponse(
        attestation_token=token,
        expires_in_seconds=86400,
        is_attested=True
    )

@router.get("/risk-band/{pseudonym_id}", response_model=RiskBandResponse)
def get_risk_band(
    pseudonym_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z0_PERSONNEL")),
):
    # The device pulls the HR risk band and fuses locally, so private
    # on-device state never has to leave the phone.
    record = cohort_manager.get_personnel_by_pseudonym(pseudonym_id)
    if record is None:
        if cohort_manager.personnel_df.empty:
            raise HTTPException(status_code=503, detail="Cohort data not initialized yet.")
        raise HTTPException(status_code=404, detail="Personnel record not found.")

    ctx = record["force_type"]
    baseline = cohort_manager.cohort_stats.get(ctx, {"median": 0.50, "mad": 0.12, "count": 0})

    assessed = hr_risk_engine.predict_with_confidence(record, baseline)

    # Trend from this person's recorded case history (never fabricated).
    from app.ml.trajectory import build_trajectory
    history = list(db.scalars(
        select(CaseRecord).where(CaseRecord.pseudonym_id == pseudonym_id)
    ))
    trajectory = build_trajectory(history)

    return RiskBandResponse(
        pseudonym_id=pseudonym_id,
        as_of=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        h_band=assessed["h_band"],
        reason_codes=assessed["reason_codes"],
        thresholds={"tau1": 0.45, "tau2": 0.65, "tau3": 0.85},
        unit_baseline_median=baseline["median"],
        model_version=assessed["model_version"],
        confidence=assessed["confidence"],
        confidence_note=assessed["confidence_note"],
        trend=trajectory["trend"],
    )

@router.post("/escalations")
@limiter.limit("30/minute")
def submit_escalation(
    request: Request,
    payload: EscalationPayload,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z0_PERSONNEL")),
):
    # Only pseudonym + tier + whitelisted reason codes are accepted here.
    # No diary text, audio, or continuous scores ever reach this endpoint.
    clean_codes = validate_reason_codes(payload.reason_codes)
    if not clean_codes:
        clean_codes = ["RC_MOOD_TRAJECTORY_DROP"]

    if idempotency_key:
        previous = db.get(IdempotencyRecord, idempotency_key)
        if previous:
            return {"status": "accepted", "case_id": previous.case_id, "tier": payload.tier, "duplicate": True}

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"

    df = cohort_manager.personnel_df
    unit_context = "General Unit"
    if not df.empty:
        match = df[df["pseudonym_id"] == payload.pseudonym_id]
        if not match.empty:
            unit_context = match.iloc[0]["unit_name"]

    case_record = CaseRecord(
        case_id=case_id,
        pseudonym_id=payload.pseudonym_id,
        tier=payload.tier,
        origin=payload.origin,
        reason_codes=clean_codes,
        opened_at=payload.detected_at or datetime.now(timezone.utc).isoformat(),
        status="open",
        unit_context=unit_context,
        h_band=3 if payload.tier in ["elevated", "critical"] else 1,
        has_acute_marker="RC_ACUTE_DISTRESS_MARKER" in clean_codes,
    )
    db.add(case_record)
    if idempotency_key:
        db.add(IdempotencyRecord(key=idempotency_key, case_id=case_id))
    db.commit()

    audit_ledger.append_log(
        actor_role="edge_device",
        actor_id=payload.pseudonym_id[:8],
        action="ESCALATION_INTAKE_RECORDED",
        case_id=case_id,
        pseudonym_id=payload.pseudonym_id,
        metadata={"tier": payload.tier, "reason_count": len(clean_codes)}
    )

    # Critical welfare signals raise an alert: generated → notified (or
    # recorded with delivery note) → status persisted. See alerts_api.
    if payload.tier == "critical" or "RC_ACUTE_DISTRESS_MARKER" in clean_codes:
        from app.routes.alerts_api import raise_alert
        raise_alert(
            db,
            case_id=case_id,
            pseudonym_id=payload.pseudonym_id,
            tier=payload.tier,
            reason=";".join(clean_codes),
            actor_sub=payload.pseudonym_id[:8],
        )
        db.commit()

    return {"status": "accepted", "case_id": case_id, "tier": payload.tier}

@router.post("/self-referral")
@limiter.limit("10/minute")
def submit_self_referral(
    request: Request,
    req: SelfReferralRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z0_PERSONNEL")),
):
    case_id = f"CASE-SELF-{uuid.uuid4().hex[:6].upper()}"
    db.add(CaseRecord(
        case_id=case_id,
        pseudonym_id=req.pseudonym_id,
        tier="elevated",
        origin="self_referral",
        reason_codes=["RC_MOOD_TRAJECTORY_DROP"],
        opened_at=req.request_timestamp or datetime.now(timezone.utc).isoformat(),
        status="open",
        unit_context="Self-Initiated Welfare Connect",
        h_band=2,
        has_acute_marker=False,
    ))
    db.commit()

    audit_ledger.append_log(
        actor_role="personnel_self",
        actor_id=req.pseudonym_id[:8],
        action="SELF_REFERRAL_CREATED",
        case_id=case_id,
        pseudonym_id=req.pseudonym_id,
        metadata={"preference": req.support_type_preference}
    )

    return {"status": "created", "case_id": case_id}

@router.post("/erasure")
@limiter.limit("5/minute")
def request_data_erasure(
    request: Request,
    req: ErasureRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z0_PERSONNEL")),
):
    # Confirmation tokens are validated, never ignored. The client must echo
    # the explicit per-pseudonym token: CONFIRM-<PSEUDONYM_ID>.
    expected_token = f"CONFIRM-{req.pseudonym_id}"
    if req.confirmation_token != expected_token:
        raise HTTPException(
            status_code=400,
            detail="Valid confirmation token is required. Expected CONFIRM-<pseudonym_id>.",
        )

    from app.core.database import InterventionRecord

    cases = list(db.scalars(select(CaseRecord).where(CaseRecord.pseudonym_id == req.pseudonym_id)))
    case_ids = [c.case_id for c in cases]
    interventions_deleted = 0
    if case_ids:
        existing = list(
            db.scalars(select(InterventionRecord).where(InterventionRecord.case_id.in_(case_ids)))
        )
        interventions_deleted = len(existing)
        for item in existing:
            db.delete(item)
    deleted_count = len(cases)
    for case in cases:
        db.delete(case)
    db.commit()

    # Retention policy: operational case + intervention records for this
    # pseudonym are deleted; the audit event itself is retained (without
    # personal content) for accountability, per docs/DataRetention.md.
    audit_ledger.append_log(
        actor_role="personnel_data_principal",
        actor_id=req.pseudonym_id[:8],
        action="ERASURE_PURGE_EXECUTED",
        pseudonym_id=req.pseudonym_id,
        metadata={
            "purged_cases": deleted_count,
            "purged_interventions": interventions_deleted,
            "retained": "audit event only (no personal content)",
        },
    )

    return {
        "status": "purged",
        "purged_cases": deleted_count,
        "purged_interventions": interventions_deleted,
        "retained": "audit event retained per retention policy",
    }
