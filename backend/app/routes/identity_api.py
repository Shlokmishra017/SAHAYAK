"""Identity broker: dual-custodian break-glass de-anonymization."""

from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import IdentityBroker, BreakGlassRequest
from app.core.auth import require_roles

router = APIRouter(prefix="/v1/identity", tags=["Identity Broker"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/break-glass")
@limiter.limit("5/minute")
def break_glass_deanonymize(request: Request, req: BreakGlassRequest, _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER", "AUDITOR"))):
    success, profile, message = IdentityBroker.break_glass_deanonymize(req)
    if not success:
        raise HTTPException(status_code=403, detail=message)

    return {
        "status": "authorized",
        "message": message,
        "identity": profile.model_dump()
    }

@router.get("/custodians-info")
@limiter.limit("30/minute")
def get_custodian_info(request: Request, _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER", "AUDITOR"))):
    return {
        "authorized_custodians_demo": [
            {"id": "WO_7742", "role": "welfare_officer", "name": "Capt. Meera Nair (Unit Welfare Officer)", "demo_pin": "9481"},
            {"id": "MO_3109", "role": "medical_officer", "name": "Maj. Dr. Arvind Rao (Regimental Medical Officer)", "demo_pin": "6205"},
            {"id": "ADJ_102", "role": "adjutant", "name": "Lt. Col. Sanjeev Gill (Unit Adjutant)", "demo_pin": "8821"},
        ]
    }
