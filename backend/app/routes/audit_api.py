"""Audit ledger inspection, verification, and tamper simulation (auditor only)."""

from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles

router = APIRouter(prefix="/v1/audit", tags=["Audit & Trust Verification"])

@router.get("/logs")
def get_audit_logs(limit: int = Query(50, ge=1, le=500), _user: dict = Depends(require_roles("AUDITOR"))):
    chain = audit_ledger.get_chain(limit=limit)
    return {
        "total_blocks": len(audit_ledger._chain),
        "blocks": [b.model_dump() for b in chain]
    }

@router.get("/verify")
def verify_audit_chain(_user: dict = Depends(require_roles("AUDITOR"))):
    is_valid, reason, broken_seq = audit_ledger.verify_integrity()
    return {
        "is_valid": is_valid,
        "total_blocks_checked": len(audit_ledger._chain),
        "status_message": reason,
        "broken_sequence_block": broken_seq
    }

@router.post("/tamper-simulation")
def simulate_tampering(block_seq: int = Query(1, ge=1, description="Sequence number of block to tamper with"), _user: dict = Depends(require_roles("AUDITOR"))):
    success = audit_ledger.tamper_demo(block_seq)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid block sequence for tampering.")

    is_valid, reason, broken_seq = audit_ledger.verify_integrity()
    return {
        "tampering_applied_to_seq": block_seq,
        "verification_result": {
            "is_valid": is_valid,
            "broken_sequence_block": broken_seq,
            "status_message": reason
        }
    }

@router.post("/restore-chain")
def restore_chain(_user: dict = Depends(require_roles("AUDITOR"))):
    audit_ledger.restore_chain()
    return {"status": "chain_restored_and_verified", "is_valid": True}
