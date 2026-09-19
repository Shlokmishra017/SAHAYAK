"""
Dual-Custodian Break-Glass Identity Broker
Enforces separation of duties:
Z1 Welfare Core holds only pseudonyms (UUIDs).
Z2 Identity Broker holds real personnel records.
Re-identification requires two concurrent authorized credentials:
1. Welfare Officer Auth (PIN / Digital Signature)
2. Unit Medical Officer / Adjutant Auth (PIN / Digital Signature)
Every break-glass invocation creates a permanent SHA-256 audit entry.
"""

import os
from typing import Dict, Optional, Tuple
from pydantic import BaseModel
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

class RealIdentityProfile(BaseModel):
    pseudonym_id: str
    service_number: str
    full_name: str
    rank: str
    unit: str
    blood_group: str
    emergency_contact_phone: str
    emergency_contact_name: str
    base_location: str

class IdentityBroker:
    # Simulated authoritative identity registry (air-gapped from Z1 in real life)
    _REGISTRY: Dict[str, RealIdentityProfile] = {}

    # Authorized custodian credentials from environment variables
    _AUTHORIZED_CUSTODIANS: Dict[str, Dict[str, str]] = {}

    @classmethod
    def _load_custodians(cls):
        """Load authorized custodians from environment variables."""
        # Define expected custodians and their environment variable prefixes
        custodian_defs = [
            ("welfare_officer", "WELFARE_OFFICER"),
            ("medical_officer", "MEDICAL_OFFICER"),
            ("adjutant", "ADJUTANT")
        ]

        for role, prefix in custodian_defs:
            custodian_id = os.getenv(f"{prefix}_ID")
            custodian_pin = os.getenv(f"{prefix}_PIN")

            if not custodian_id or not custodian_pin:
                raise ValueError(
                    f"Missing required environment variables for {role}: "
                    f"{prefix}_ID and {prefix}_PIN must be set"
                )

            cls._AUTHORIZED_CUSTODIANS[custodian_id] = {"role": role, "pin": custodian_pin}

    @classmethod
    def register_personnel(cls, profile: RealIdentityProfile):
        cls._REGISTRY[profile.pseudonym_id] = profile

    @classmethod
    def break_glass_deanonymize(cls, req: BreakGlassRequest) -> Tuple[bool, Optional[RealIdentityProfile], str]:
        """
        Executes dual-custodian validation.
        """
        # Ensure custodians are loaded
        if not cls._AUTHORIZED_CUSTODIANS:
            cls._load_custodians()

        # Validate Custodian 1
        c1 = cls._AUTHORIZED_CUSTODIANS.get(req.custodian_1_id)
        if not c1 or c1["role"] != req.custodian_1_role or c1["pin"] != req.custodian_1_pin:
            audit_ledger.append_log(
                actor_role="security_gateway",
                actor_id=req.custodian_1_id,
                action="BREAK_GLASS_REJECTED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={"reason": "Invalid Custodian 1 credentials"}
            )
            return False, None, "Custodian 1 verification failed. Access denied."

        # Validate Custodian 2
        c2 = cls._AUTHORIZED_CUSTODIANS.get(req.custodian_2_id)
        if not c2 or c2["role"] != req.custodian_2_role or c2["pin"] != req.custodian_2_pin:
            audit_ledger.append_log(
                actor_role="security_gateway",
                actor_id=req.custodian_2_id,
                action="BREAK_GLASS_REJECTED",
                case_id=req.case_id,
                pseudonym_id=req.pseudonym_id,
                metadata={"reason": "Invalid Custodian 2 credentials"}
            )
            return False, None, "Custodian 2 verification failed. Dual authorization required."

        # Prevent same custodian signing twice
        if req.custodian_1_id == req.custodian_2_id:
            return False, None, "Dual custody requires two distinct authorized officers."

        # Look up identity
        profile = cls._REGISTRY.get(req.pseudonym_id)
        if not profile:
            return False, None, "Pseudonym ID not found in identity registry."

        # Log Break-Glass in immutable audit chain
        audit_ledger.append_log(
            actor_role="dual_custodians",
            actor_id=f"{req.custodian_1_id}+{req.custodian_2_id}",
            action="BREAK_GLASS_DEANONYMIZATION_AUTHORIZED",
            case_id=req.case_id,
            pseudonym_id=req.pseudonym_id,
            metadata={
                "justification": req.justification,
                "custodian_1": req.custodian_1_id,
                "custodian_2": req.custodian_2_id,
                "service_number": profile.service_number
            }
        )

        return True, profile, "Dual-custodian break-glass authorization approved."
