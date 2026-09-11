"""
Identity Broker API (Z2 Identity Broker)
Simulates the air-gapped identity broker for dual-custodian break-glass de-anonymization.
"""

from fastapi import APIRouter, HTTPException
from app.core.security import IdentityBroker, BreakGlassRequest

router = APIRouter(prefix="/v1/identity", tags=["Identity Broker"])

@router.post("/break-glass")
def break_glass_deanonymize(req: BreakGlassRequest):
    """
    Dual-custodian protocol to resolve pseudonym to real identity in emergency cases.
    Requires concurrent credentials from 2 authorized officers.
    """
    success, profile, message = IdentityBroker.break_glass_deanonymize(req)
    if not success:
        raise HTTPException(status_code=403, detail=message)

    return {
        "status": "authorized",
        "message": message,
        "identity": profile.dict()
    }

@router.get("/custodians-info")
def get_custodian_info():
    """
    Returns available mock custodian roles for demo purposes.
    """
    return {
        "authorized_custodians_demo": [
            {"id": "WO_7742", "role": "welfare_officer", "name": "Capt. Meera Nair (Unit Welfare Officer)", "demo_pin": "9481"},
            {"id": "MO_3109", "role": "medical_officer", "name": "Maj. Dr. Arvind Rao (Regimental Medical Officer)", "demo_pin": "6205"},
            {"id": "ADJ_102", "role": "adjutant", "name": "Lt. Col. Sanjeev Gill (Unit Adjutant)", "demo_pin": "8821"},
        ]
    }
