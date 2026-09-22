"""Service-credential login with explicit seeded demo identities."""

import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict
from app.core.auth import create_access_token, hash_password, verify_password
from app.core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/v1/auth", tags=["Authentication & Identity"])
limiter = Limiter(key_func=get_remote_address)

# Seeded demo credential for the four documented demo identities below.
# Override in deployment via DEMO_ACCOUNT_PASSWORD. Unknown service IDs are
# always rejected (no auto-provisioning).
DEMO_ACCOUNT_PASSWORD = os.getenv("DEMO_ACCOUNT_PASSWORD", "ServicePass@2026")  # ci-allow-seeded-demo

class LoginRequest(BaseModel):
    full_name: str
    service_id: str
    password: str

class AuthUser(BaseModel):
    id: str
    service_id: str
    full_name: str
    rank: str
    unit: str
    role: str
    level_label: str
    clearance: str
    avatar: str

class LoginResponse(BaseModel):
    authenticated: bool
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser

# Demo directory; unknown IDs are provisioned on the fly in demo mode.
ACCOUNTS_DB: Dict[str, Dict] = {
    "CAPF-849201": {
        "service_id": "CAPF-849201",
        "full_name": "Vikram Singh",
        "rank": "Constable (GD)",
        "unit": "CRPF 144 Bn (CI Ops)",
        "role": "Z0_PERSONNEL",
        "level_label": "Level 0 — Force Personnel (Jawan) Confidential Wellness Suite",
        "clearance": "Confidential (Local Enclave)",
        "avatar": "VS"
    },
    "WO-7742": {
        "service_id": "WO-7742",
        "full_name": "Meera Nair",
        "rank": "Capt. / Unit Welfare Officer",
        "unit": "Sector Welfare Board",
        "role": "Z1_WELFARE_OFFICER",
        "level_label": "Level 1 — Unit Welfare Officer Triage & Intervention Core",
        "clearance": "Welfare Officer (Case Triage Level)",
        "avatar": "MN"
    },
    "CMD-1082": {
        "service_id": "CMD-1082",
        "full_name": "R. V. Deshmukh",
        "rank": "Col. / Sector Commander",
        "unit": "Sector HQ, Srinagar",
        "role": "Z1_COMMANDER",
        "level_label": "Level 2 — Battalion / Sector Commander Macro Strategy",
        "clearance": "Command Level (k-Anonymity Guarded)",
        "avatar": "RD"
    },
    "AUD-9901": {
        "service_id": "AUD-9901",
        "full_name": "Alok Verma",
        "rank": "Inspector / Systems Auditor",
        "unit": "Central Compliance Bureau",
        "role": "AUDITOR",
        "level_label": "Level 3 — Technical Auditor & Cryptographic Trust Verifier",
        "clearance": "Cryptographic Ledger Inspector",
        "avatar": "AV"
    }
}

for account in ACCOUNTS_DB.values():
    account["password_hash"] = hash_password(DEMO_ACCOUNT_PASSWORD)

@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def authenticate_user(request: Request, req: LoginRequest):
    svc_id = req.service_id.strip().upper()
    account = ACCOUNTS_DB.get(svc_id)

    # Explicit seeded demo identities only. Unknown service IDs are rejected
    # in both demo and production mode so arbitrary prefixes can never
    # bypass meaningful authentication.
    if not account:
        raise HTTPException(status_code=401, detail="Invalid service credentials")

    if not verify_password(req.password, account["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid service credentials")

    return LoginResponse(
        authenticated=True,
        access_token=create_access_token(account),
        expires_in=settings.jwt_expiry_minutes * 60,
        user=AuthUser(
            id=account["service_id"],
            service_id=account["service_id"],
            full_name=account["full_name"],
            rank=account["rank"],
            unit=account["unit"],
            role=account["role"],
            level_label=account["level_label"],
            clearance=account["clearance"],
            avatar=account["avatar"]
        )
    )
