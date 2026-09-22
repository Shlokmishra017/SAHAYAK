"""Identity broker: dual-custodian break-glass de-anonymization."""

import os
from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import IdentityBroker, BreakGlassRequest
from app.core.auth import require_roles

router = APIRouter(prefix="/v1/identity", tags=["Identity Broker"])
limiter = Limiter(key_func=get_remote_address)


def _public_custodian_list():
    """Custodian directory WITHOUT PINs. PINs are never exposed via API."""
    defs = [
        (os.getenv("WELFARE_OFFICER_ID", "WO_7742"), "welfare_officer", "Unit Welfare Officer"),
        (os.getenv("MEDICAL_OFFICER_ID", "MO_3109"), "medical_officer", "Regimental Medical Officer"),
        (os.getenv("ADJUTANT_ID", "ADJ_102"), "adjutant", "Unit Adjutant"),
    ]
    return [{"id": cid, "role": role, "name": name} for cid, role, name in defs]


@router.post("/break-glass")
@limiter.limit("5/minute")
def break_glass_deanonymize(request: Request, req: BreakGlassRequest, _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER", "AUDITOR"))):
    from app.core.security import BREAK_GLASS_TTL_MINUTES

    success, profile, message = IdentityBroker.break_glass_deanonymize(req, requester_sub=_user.get("sub", "unknown"))
    if not success:
        raise HTTPException(status_code=403, detail=message)

    assert profile is not None
    return {
        "status": "authorized",
        "message": message,
        "identity": profile.model_dump(),
        "access_expires_in_minutes": BREAK_GLASS_TTL_MINUTES,
        "disclosure": "minimum-necessary: service number, name, rank, unit only",
    }


@router.get("/custodians-info")
@limiter.limit("30/minute")
def get_custodian_info(request: Request, _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER", "AUDITOR"))):
    # PINs are never returned. Clients must collect PINs via secure input.
    from app.core.config import settings
    return {
        "authorized_custodians": _public_custodian_list(),
        "demo_mode": settings.demo_mode,
    }
