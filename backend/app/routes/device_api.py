"""
Device API Endpoints (Z0 <-> Z1 Edge Gateway)
Handles:
- Device Attestation token generation
- Inverted Risk Band pull (fetching unit-calibrated h_band and reason codes)
- Escalation intake (receives pseudonym + tier + whitelist reason codes; NO raw personal text)
- Self-referral intake
- DPDP Erasure request
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/device", tags=["Device Edge Gateway"])
limiter = Limiter(key_func=get_remote_address)
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

@router.post("/attest", response_model=DeviceAttestationResponse)
@limiter.limit("10/minute")
def attest_device(request: Request, req: DeviceAttestationRequest, _user: dict = Depends(require_roles("Z0_PERSONNEL"))):
    """
    Simulates hardware device attestation (Play Integrity / DeviceCheck).
    Verifies the device is untampered before allowing risk-band sync.
    """
    token = f"attest_tok_{uuid.uuid4().hex[:16]}"
    return DeviceAttestationResponse(
        attestation_token=token,
        expires_in_seconds=86400,
        is_attested=True
    )

@router.get("/risk-band/{pseudonym_id}", response_model=RiskBandResponse)
def get_risk_band(pseudonym_id: str, _user: dict = Depends(require_roles("Z0_PERSONNEL"))):
    """
    The device pulls the server-side HR risk band.
    Inverts the privacy flow: Device pulls HR data and fuses locally,
    preventing private psychological state from leaving the device.
    """
    record = cohort_manager.get_personnel_by_pseudonym(pseudonym_id)
    if not record:
        raise HTTPException(status_code=503, detail="Cohort data not initialized yet.")

    ctx = record["force_type"]
    baseline = cohort_manager.cohort_stats.get(ctx, {"median": 0.50, "mad": 0.12})

    raw_score, h_band, reason_codes, _ = hr_risk_engine.predict_individual_risk(record, baseline)

    return RiskBandResponse(
        pseudonym_id=pseudonym_id,
        as_of=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        h_band=h_band,
        reason_codes=reason_codes,
        thresholds={"tau1": 0.45, "tau2": 0.65, "tau3": 0.85},
        unit_baseline_median=baseline["median"],
        model_version="sahayak-hr-lgbm-v1.4"
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
    """
    Device submits an escalation when local fusion reaches Elevated or Critical tier.
    CRITICAL INVARIANT: Contains ONLY pseudonym_id, tier, whitelisted reason codes.
    Zero raw diary text, audio, or continuous wellness scores are accepted.
    """
    # Validate reason codes against closed whitelist
    clean_codes = validate_reason_codes(payload.reason_codes)
    if not clean_codes:
        clean_codes = ["RC_MOOD_TRAJECTORY_DROP"]

    if idempotency_key:
        previous = db.get(IdempotencyRecord, idempotency_key)
        if previous:
            return {"status": "accepted", "case_id": previous.case_id, "tier": payload.tier, "duplicate": True}

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    
    # Lookup unit context for the case without storing names
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

    # Log escalation intake into immutable SHA-256 audit ledger
    audit_ledger.append_log(
        actor_role="edge_device",
        actor_id=payload.pseudonym_id[:8],
        action="ESCALATION_INTAKE_RECORDED",
        case_id=case_id,
        pseudonym_id=payload.pseudonym_id,
        metadata={"tier": payload.tier, "reason_count": len(clean_codes)}
    )

    return {"status": "accepted", "case_id": case_id, "tier": payload.tier}

@router.post("/self-referral")
@limiter.limit("10/minute")
def submit_self_referral(
    request: Request,
    req: SelfReferralRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z0_PERSONNEL")),
):
    """
    Voluntary self-referral initiated by personnel.
    Always accepted directly into triage queue.
    """
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
    """
    DPDP compliant Right to Erasure / Data Purge.
    Clears all active flags and server records linked to the pseudonym.
    """
    deleted_count = 0
    cases = list(db.scalars(select(CaseRecord).where(CaseRecord.pseudonym_id == req.pseudonym_id)))
    deleted_count = len(cases)
    for case in cases:
        db.delete(case)
    db.commit()

    audit_ledger.append_log(
        actor_role="personnel_data_principal",
        actor_id=req.pseudonym_id[:8],
        action="DPDP_ERASURE_PURGE_EXECUTED",
        pseudonym_id=req.pseudonym_id,
        metadata={"purged_cases": deleted_count}
    )

    return {"status": "purged", "purged_cases": deleted_count}
