"""
Authentication & RBAC Identity Service
Validates service credentials and automatically resolves user role and security clearance.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict
from app.core.auth import create_access_token, hash_password, verify_password
from app.core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/v1/auth", tags=["Authentication & Identity"])
limiter = Limiter(key_func=get_remote_address)

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
    role: str  # "Z0_PERSONNEL" | "Z1_WELFARE_OFFICER" | "Z1_COMMANDER" | "AUDITOR"
    level_label: str
    clearance: str
    avatar: str

class LoginResponse(BaseModel):
    authenticated: bool
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser

# Authoritative Account Directory (Simulated DB)
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
    account["password_hash"] = hash_password("ServicePass@2026")

@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def authenticate_user(request: Request, req: LoginRequest):
    svc_id = req.service_id.strip().upper()
    
    # Check if known service ID
    account = ACCOUNTS_DB.get(svc_id)
    
    if not account and not settings.demo_mode:
        raise HTTPException(status_code=401, detail="Invalid service credentials")

    if not account:
        # Fallback dynamic provisioning for any general service ID
        if svc_id.startswith("WO") or "WELFARE" in svc_id:
            role = "Z1_WELFARE_OFFICER"
            level = "Level 1 — Unit Welfare Officer Triage & Intervention Core"
            rank = "Welfare Officer"
        elif svc_id.startswith("CMD") or "COM" in svc_id:
            role = "Z1_COMMANDER"
            level = "Level 2 — Battalion / Sector Commander Macro Strategy"
            rank = "Commander"
        elif svc_id.startswith("AUD") or "INSPECT" in svc_id:
            role = "AUDITOR"
            level = "Level 3 — Technical Auditor & Cryptographic Trust Verifier"
            rank = "Auditor"
        else:
            role = "Z0_PERSONNEL"
            level = "Level 0 — Force Personnel (Jawan) Confidential Wellness Suite"
            rank = "Force Personnel"

        account = {
            "service_id": svc_id,
            "full_name": req.full_name or "Authenticated Officer",
            "rank": rank,
            "unit": "CAPF Operational Unit",
            "role": role,
            "level_label": level,
            "clearance": "Standard RBAC",
            "avatar": (req.full_name[:2] if len(req.full_name) >= 2 else "SO").upper()
        }

        account["password_hash"] = hash_password(req.password)

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
