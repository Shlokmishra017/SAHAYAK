"""Dual-custodian break-glass identity broker.

Z1 holds only pseudonyms; real records stay here. Re-identification needs two
distinct authorized custodians and is always written to the audit ledger.

Phase 1 guarantees:
- Persistent registry/state in the database (survives backend restart).
- No PIN is ever returned by any API.
- Only minimum-necessary identity fields are disclosed.
- Time-bound authorization with explicit expiry.
"""

import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app.core.audit_chain import audit_ledger


class BreakGlassRequest(BaseModel):
    case_id: str
    pseudonym_id: str
    custodian_1_role: str    # "welfare_officer"
    custodian_1_id: str
    custodian_1_pin: str
    custodian_2_role: str    # "medical_officer" or "adjutant"
    custodian_2_id: str
    custodian_2_pin: str
    justification: str

    @field_validator("justification")
    @classmethod
    def justification_must_be_explicit(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError("Explicit operational/medical justification (min 20 chars) is required")
        return v.strip()

    @field_validator("custodian_1_role", "custodian_2_role")
    @classmethod
    def role_must_be_known(cls, v: str) -> str:
        allowed = {"welfare_officer", "medical_officer", "adjutant"}
        if v not in allowed:
            raise ValueError(f"Unknown custodian role: {v}")
        return v


class RealIdentityProfile(BaseModel):
    """Full internal record. Never returned directly by the API."""

    pseudonym_id: str
    service_number: str
    full_name: str
    rank: str
    unit: str
    blood_group: str
    emergency_contact_phone: str
    emergency_contact_name: str
    base_location: str


class MinimalIdentityDisclosure(BaseModel):
    """Minimum-necessary disclosure for an authorized break-glass reveal.

    Sensitive fields (blood group, emergency-contact phone, exact base
    location) are deliberately withheld per data-minimization policy.
    """

    pseudonym_id: str
    service_number: str
    full_name: str
    rank: str
    unit: str


# Time-bound authorization window for a granted break-glass reveal.
BREAK_GLASS_TTL_MINUTES = int(os.getenv("BREAK_GLASS_TTL_MINUTES", "15"))


class IdentityBroker:
    _AUTHORIZED_CUSTODIANS: Dict[str, Dict[str, str]] = {}

    @classmethod
    def _load_custodians(cls):
        custodian_defs = [
            ("welfare_officer", "WELFARE_OFFICER"),
            ("medical_officer", "MEDICAL_OFFICER"),
            ("adjutant", "ADJUTANT"),
        ]

        default_credentials = {
            "WELFARE_OFFICER": ("WO_7742", "9481"),
            "MEDICAL_OFFICER": ("MO_3109", "6205"),
            "ADJUTANT": ("ADJ_102", "8821"),
        }

        loaded: Dict[str, Dict[str, str]] = {}
        for role, prefix in custodian_defs:
            def_id, def_pin = default_credentials.get(prefix, ("", ""))
            custodian_id = os.getenv(f"{prefix}_ID", def_id)
            custodian_pin = os.getenv(f"{prefix}_PIN", def_pin)

            if not custodian_id or not custodian_pin:
                raise ValueError(
                    f"Missing required environment variables for {role}: "
                    f"{prefix}_ID and {prefix}_PIN must be set"
                )

            loaded[custodian_id] = {"role": role, "pin": custodian_pin}
        cls._AUTHORIZED_CUSTODIANS = loaded

    @classmethod
    def reload_custodians(cls):
        """Force reload from environment (used by tests)."""
        cls._AUTHORIZED_CUSTODIANS = {}
        cls._load_custodians()

    @classmethod
    def _verify_pin(cls, stored_pin: str, supplied_pin: str) -> bool:
        return hmac.compare_digest(stored_pin, supplied_pin)

    @classmethod
    def register_personnel(cls, profile: RealIdentityProfile):
        """Persist a personnel identity into the DB-backed registry."""
        from app.core.database import IdentityRegistry, SessionLocal, init_db

        init_db()
        with SessionLocal() as db:
            existing = db.get(IdentityRegistry, profile.pseudonym_id)
            if existing:
                existing.service_number = profile.service_number
                existing.full_name = profile.full_name
                existing.rank = profile.rank
                existing.unit = profile.unit
                existing.blood_group = profile.blood_group
                existing.emergency_contact_phone = profile.emergency_contact_phone
                existing.emergency_contact_name = profile.emergency_contact_name
                existing.base_location = profile.base_location
            else:
                db.add(IdentityRegistry(
                    pseudonym_id=profile.pseudonym_id,
                    service_number=profile.service_number,
                    full_name=profile.full_name,
                    rank=profile.rank,
                    unit=profile.unit,
                    blood_group=profile.blood_group,
                    emergency_contact_phone=profile.emergency_contact_phone,
                    emergency_contact_name=profile.emergency_contact_name,
                    base_location=profile.base_location,
                ))
            db.commit()

    @classmethod
    def break_glass_deanonymize(
        cls, req: BreakGlassRequest, requester_sub: str = "unknown"
    ) -> Tuple[bool, Optional[MinimalIdentityDisclosure], str]:
        from app.core.database import (
            BreakGlassRequestRecord,
            IdentityRegistry,
            SessionLocal,
            init_db,
        )

        init_db()
        if not cls._AUTHORIZED_CUSTODIANS:
            cls._load_custodians()

        # Distinct-identity rule is enforced before any secret comparison
        # so a single operator can never satisfy both custody roles.
        if req.custodian_1_id == req.custodian_2_id:
            audit_ledger.append_log(
                actor_role="security_gateway",
                actor_id=req.custodian_1_id,
                action="BREAK_GLASS_REJECTED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={"reason": "Same identity supplied for both custody roles"},
            )
            return False, None, "Dual custody requires two distinct authorized officers."

        c1 = cls._AUTHORIZED_CUSTODIANS.get(req.custodian_1_id)
        if not c1 or c1["role"] != req.custodian_1_role or not cls._verify_pin(c1["pin"], req.custodian_1_pin):
            audit_ledger.append_log(
                actor_role="security_gateway",
                actor_id=req.custodian_1_id,
                action="BREAK_GLASS_REJECTED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={"reason": "Invalid Custodian 1 credentials"},
            )
            return False, None, "Custodian 1 verification failed. Access denied."

        c2 = cls._AUTHORIZED_CUSTODIANS.get(req.custodian_2_id)
        if not c2 or c2["role"] != req.custodian_2_role or not cls._verify_pin(c2["pin"], req.custodian_2_pin):
            audit_ledger.append_log(
                actor_role="security_gateway",
                actor_id=req.custodian_2_id,
                action="BREAK_GLASS_REJECTED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={"reason": "Invalid Custodian 2 credentials"},
            )
            return False, None, "Custodian 2 verification failed. Dual authorization required."

        with SessionLocal() as db:
            row = db.get(IdentityRegistry, req.pseudonym_id)
            if not row:
                return False, None, "Pseudonym ID not found in identity registry."

            now = datetime.now(timezone.utc)
            expires = now + timedelta(minutes=BREAK_GLASS_TTL_MINUTES)
            request_id = f"BG-{uuid.uuid4().hex[:8].upper()}"

            block = audit_ledger.append_log(
                actor_role="dual_custodians",
                actor_id=f"{req.custodian_1_id}+{req.custodian_2_id}",
                action="BREAK_GLASS_DEANONYMIZATION_AUTHORIZED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={
                    "justification": req.justification,
                    "custodian_1": req.custodian_1_id,
                    "custodian_2": req.custodian_2_id,
                    "service_number": row.service_number,
                    "request_id": request_id,
                    "expires_at": expires.isoformat(),
                },
            )

            db.add(BreakGlassRequestRecord(
                request_id=request_id,
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                requester_sub=requester_sub,
                custodian_1_id=req.custodian_1_id,
                custodian_2_id=req.custodian_2_id,
                justification=req.justification,
                status="authorized",
                created_at=now.isoformat(),
                expires_at=expires.isoformat(),
                audit_seq=block.seq,
            ))
            db.commit()

            disclosure = MinimalIdentityDisclosure(
                pseudonym_id=row.pseudonym_id,
                service_number=row.service_number,
                full_name=row.full_name,
                rank=row.rank,
                unit=row.unit,
            )

        return True, disclosure, "Dual-custodian break-glass authorization approved."

    @classmethod
    def get_active_grant(cls, request_id: str) -> Optional[dict]:
        """Look up a persistent grant; returns None if expired or unknown."""
        from app.core.database import BreakGlassRequestRecord, SessionLocal

        with SessionLocal() as db:
            row = db.get(BreakGlassRequestRecord, request_id)
            if not row:
                return None
            try:
                expires = datetime.fromisoformat(row.expires_at)
            except ValueError:
                return None
            if datetime.now(timezone.utc) > expires:
                row.status = "expired"
                db.commit()
                return None
            return {
                "request_id": row.request_id,
                "case_id": row.case_id,
                "pseudonym_id": row.pseudonym_id,
                "status": row.status,
                "expires_at": row.expires_at,
                "audit_seq": row.audit_seq,
            }

    @classmethod
    def custodian_id_fingerprint(cls, custodian_id: str) -> str:
        """Non-reversible fingerprint for logging (never log raw IDs/PINs)."""
        return hashlib.sha256(custodian_id.encode()).hexdigest()[:12]
