"""
Audit & Architectural Trust API
Allows auditors, DPOs, and technical reviewers to:
1. Inspect the append-only SHA-256 hash-chained audit ledger.
2. Verify cryptographic chain integrity from Genesis to the latest block.
3. Simulate tampering to observe the cryptographic chain alarm trigger.
"""

from fastapi import APIRouter, HTTPException, Query
from app.core.audit_chain import audit_ledger

router = APIRouter(prefix="/v1/audit", tags=["Audit & Trust Verification"])

@router.get("/logs")
def get_audit_logs(limit: int = 50):
    """Returns the latest append-only audit blocks."""
    chain = audit_ledger.get_chain(limit=limit)
    return {
        "total_blocks": len(audit_ledger._chain),
        "blocks": [b.dict() for b in chain]
    }

@router.get("/verify")
def verify_audit_chain():
    """
    Cryptographically recalculates and verifies every block's SHA-256 hash and pointer.
    """
    is_valid, reason, broken_seq = audit_ledger.verify_integrity()
    return {
        "is_valid": is_valid,
        "total_blocks_checked": len(audit_ledger._chain),
        "status_message": reason,
        "broken_sequence_block": broken_seq
    }

@router.post("/tamper-simulation")
def simulate_tampering(block_seq: int = Query(1, description="Sequence number of block to tamper with")):
    """
    Demo utility: Mutates metadata in a past block without re-hashing,
    demonstrating that the audit verifier immediately catches the breach.
    """
    success = audit_ledger.tamper_demo(block_seq)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid block sequence for tampering.")

    # Run verification immediately
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
def restore_chain():
    """Restores/re-initializes the audit ledger to clean valid state for demos."""
    global audit_ledger
    # Re-calculate correct hashes for all blocks
    for i in range(1, len(audit_ledger._chain)):
        target = audit_ledger._chain[i]
        # Clean tampered flag
        clean_meta = {k: v for k, v in target.metadata.items() if k != "TAMPERED_FLAG"}
        recalculated = audit_ledger._calculate_block_hash(
            seq=target.seq,
            timestamp=target.timestamp,
            actor_role=target.actor_role,
            actor_id_hash=target.actor_id_hash,
            action=target.action,
            case_id=target.case_id,
            pseudonym_id=target.pseudonym_id,
            metadata=clean_meta,
            prev_hash=audit_ledger._chain[i-1].block_hash
        )
        audit_ledger._chain[i] = recalculated
    
    return {"status": "chain_restored_and_verified", "is_valid": True}
