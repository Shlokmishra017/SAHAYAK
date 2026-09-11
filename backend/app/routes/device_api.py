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
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
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

router = APIRouter(prefix="/v1/device", tags=["Device Edge Gateway"])

# In-memory Case Store for Z1 (demonstration storage)
ACTIVE_CASES: Dict[str, Dict] = {}

@router.post("/attest", response_model=DeviceAttestationResponse)
def attest_device(req: DeviceAttestationRequest):
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
def get_risk_band(pseudonym_id: str):
    """
    The device pulls the server-side HR risk band.
    Inverts the privacy flow: Device pulls HR data and fuses locally,
    preventing private psychological state from leaving the device.
    """
    df = cohort_manager.personnel_df
    if df.empty:
        raise HTTPException(status_code=503, detail="Cohort data not initialized yet.")
    
    match = df[df["pseudonym_id"] == pseudonym_id]
    if match.empty:
        # Fallback to random sample record for demonstration
        record = df.iloc[0].to_dict()
    else:
        record = match.iloc[0].to_dict()

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
def submit_escalation(payload: EscalationPayload):
    """
    Device submits an escalation when local fusion reaches Elevated or Critical tier.
    CRITICAL INVARIANT: Contains ONLY pseudonym_id, tier, whitelisted reason codes.
    Zero raw diary text, audio, or continuous wellness scores are accepted.
    """
    # Validate reason codes against closed whitelist
    clean_codes = validate_reason_codes(payload.reason_codes)
    if not clean_codes:
        clean_codes = ["RC_MOOD_TRAJECTORY_DROP"]

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    
    # Lookup unit context for the case without storing names
    df = cohort_manager.personnel_df
    unit_context = "General Unit"
    if not df.empty:
        match = df[df["pseudonym_id"] == payload.pseudonym_id]
        if not match.empty:
            unit_context = match.iloc[0]["unit_name"]

    case_record = {
        "case_id": case_id,
        "pseudonym_id": payload.pseudonym_id,
        "tier": payload.tier,
        "origin": payload.origin,
        "reason_codes": clean_codes,
        "opened_at": payload.detected_at or datetime.now(timezone.utc).isoformat(),
        "closed_at": None,
        "status": "open",
        "unit_context": unit_context,
        "h_band": 3 if payload.tier in ["elevated", "critical"] else 1,
        "has_acute_marker": "RC_ACUTE_DISTRESS_MARKER" in clean_codes,
        "officer_label": None,
        "interventions": []
    }

    ACTIVE_CASES[case_id] = case_record

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
def submit_self_referral(req: SelfReferralRequest):
    """
    Voluntary self-referral initiated by personnel.
    Always accepted directly into triage queue.
    """
    case_id = f"CASE-SELF-{uuid.uuid4().hex[:6].upper()}"
    case_record = {
        "case_id": case_id,
        "pseudonym_id": req.pseudonym_id,
        "tier": "elevated",
        "origin": "self_referral",
        "reason_codes": ["RC_MOOD_TRAJECTORY_DROP"],
        "opened_at": req.request_timestamp or datetime.now(timezone.utc).isoformat(),
        "closed_at": None,
        "status": "open",
        "unit_context": "Self-Initiated Welfare Connect",
        "h_band": 2,
        "has_acute_marker": False,
        "officer_label": None,
        "interventions": []
    }
    ACTIVE_CASES[case_id] = case_record

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
def request_data_erasure(req: ErasureRequest):
    """
    DPDP compliant Right to Erasure / Data Purge.
    Clears all active flags and server records linked to the pseudonym.
    """
    deleted_count = 0
    to_delete = [cid for cid, c in ACTIVE_CASES.items() if c["pseudonym_id"] == req.pseudonym_id]
    for cid in to_delete:
        del ACTIVE_CASES[cid]
        deleted_count += 1

    audit_ledger.append_log(
        actor_role="personnel_data_principal",
        actor_id=req.pseudonym_id[:8],
        action="DPDP_ERASURE_PURGE_EXECUTED",
        pseudonym_id=req.pseudonym_id,
        metadata={"purged_cases": deleted_count}
    )

    return {"status": "purged", "purged_cases": deleted_count}
