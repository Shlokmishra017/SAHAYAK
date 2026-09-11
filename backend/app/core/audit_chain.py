"""
Cryptographic SHA-256 Hash Chain Audit Ledger
Provides an append-only, tamper-evident audit record for every access, case view,
intervention logging, and dual-custodian re-identification action.
"""

import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

class AuditBlock(BaseModel):
    seq: int
    timestamp: str
    actor_role: str        # e.g., "welfare_officer", "medical_officer", "commander", "system"
    actor_id_hash: str     # SHA-256 hash of officer ID (no plain identity in logs)
    action: str            # e.g., "CASE_ACCESSED", "INTERVENTION_LOGGED", "BREAK_GLASS_DEANONYMIZE", "FEEDBACK_LABELED"
    case_id: Optional[str] = None
    pseudonym_id: Optional[str] = None
    metadata: Dict = Field(default_factory=dict)
    prev_hash: str
    block_hash: str

class AuditChainEngine:
    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    def __init__(self):
        self._chain: List[AuditBlock] = []
        self._init_genesis()

    def _init_genesis(self):
        genesis_entry = self._calculate_block_hash(
            seq=0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_role="system",
            actor_id_hash="system_core",
            action="GENESIS_BLOCK_INITIALIZED",
            case_id=None,
            pseudonym_id=None,
            metadata={"protocol": "SAHAYAK_ZERO_TRUST_AUDIT_V1", "hash_alg": "SHA-256"},
            prev_hash=self.GENESIS_HASH
        )
        self._chain.append(genesis_entry)

    def _calculate_block_hash(
        self,
        seq: int,
        timestamp: str,
        actor_role: str,
        actor_id_hash: str,
        action: str,
        case_id: Optional[str],
        pseudonym_id: Optional[str],
        metadata: Dict,
        prev_hash: str
    ) -> AuditBlock:
        payload = {
            "seq": seq,
            "timestamp": timestamp,
            "actor_role": actor_role,
            "actor_id_hash": actor_id_hash,
            "action": action,
            "case_id": case_id,
            "pseudonym_id": pseudonym_id,
            "metadata": metadata,
            "prev_hash": prev_hash
        }
        serialized = json.dumps(payload, sort_keys=True)
        block_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        return AuditBlock(
            seq=seq,
            timestamp=timestamp,
            actor_role=actor_role,
            actor_id_hash=actor_id_hash,
            action=action,
            case_id=case_id,
            pseudonym_id=pseudonym_id,
            metadata=metadata,
            prev_hash=prev_hash,
            block_hash=block_hash
        )

    def append_log(
        self,
        actor_role: str,
        actor_id: str,
        action: str,
        case_id: Optional[str] = None,
        pseudonym_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> AuditBlock:
        """Appends a new immutable block to the chain."""
        actor_id_hash = hashlib.sha256(actor_id.encode("utf-8")).hexdigest()[:16]
        prev_hash = self._chain[-1].block_hash if self._chain else self.GENESIS_HASH
        seq = len(self._chain)
        timestamp = datetime.now(timezone.utc).isoformat()
        
        block = self._calculate_block_hash(
            seq=seq,
            timestamp=timestamp,
            actor_role=actor_role,
            actor_id_hash=actor_id_hash,
            action=action,
            case_id=case_id,
            pseudonym_id=pseudonym_id,
            metadata=metadata or {},
            prev_hash=prev_hash
        )
        self._chain.append(block)
        return block

    def get_chain(self, limit: int = 100) -> List[AuditBlock]:
        """Returns recent chain blocks."""
        return self._chain[-limit:]

    def verify_integrity(self) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Cryptographically verifies every block in the ledger.
        Returns: (is_valid, error_reason, broken_sequence_number)
        """
        if not self._chain:
            return False, "Chain is empty", None

        # Verify Genesis
        if self._chain[0].prev_hash != self.GENESIS_HASH:
            return False, "Genesis block has invalid prev_hash", 0

        for i in range(len(self._chain)):
            block = self._chain[i]
            
            # Recalculate hash
            expected_block = self._calculate_block_hash(
                seq=block.seq,
                timestamp=block.timestamp,
                actor_role=block.actor_role,
                actor_id_hash=block.actor_id_hash,
                action=block.action,
                case_id=block.case_id,
                pseudonym_id=block.pseudonym_id,
                metadata=block.metadata,
                prev_hash=block.prev_hash
            )

            if block.block_hash != expected_block.block_hash:
                return False, f"Block {i} hash mismatch (data tampering detected)", i

            if i > 0:
                prev_block = self._chain[i - 1]
                if block.prev_hash != prev_block.block_hash:
                    return False, f"Block {i} broken pointer: prev_hash does not match Block {i-1} block_hash", i

        return True, "All cryptographic blocks verified intact", None

    def tamper_demo(self, block_seq: int) -> bool:
        """Utility for demonstration to simulate an unauthorized DB alteration."""
        if 0 < block_seq < len(self._chain):
            target = self._chain[block_seq]
            # Mutate metadata without re-hashing
            tampered_meta = dict(target.metadata)
            tampered_meta["TAMPERED_FLAG"] = "Malicious edit attempted"
            self._chain[block_seq] = AuditBlock(
                seq=target.seq,
                timestamp=target.timestamp,
                actor_role=target.actor_role,
                actor_id_hash=target.actor_id_hash,
                action=target.action,
                case_id=target.case_id,
                pseudonym_id=target.pseudonym_id,
                metadata=tampered_meta,
                prev_hash=target.prev_hash,
                block_hash=target.block_hash  # Old hash now mismatched
            )
            return True
        return False

# Global Singleton instance
audit_ledger = AuditChainEngine()
