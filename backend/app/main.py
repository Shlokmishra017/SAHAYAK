"""Sahayak backend entrypoint."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.ml.synthetic_generator import cohort_manager
from app.ml.hr_risk_model import hr_risk_engine
from app.routes.device_api import router as device_router
from app.routes.welfare_api import router as welfare_router
from app.routes.command_api import router as command_router
from app.routes.identity_api import router as identity_router
from app.routes.audit_api import router as audit_router
from app.routes.auth_api import router as auth_router
from app.core.audit_chain import audit_ledger
from app.core.config import settings
from app.core.database import CaseRecord, SessionLocal, init_db
from app.core.auth import get_current_user

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    if not settings.demo_mode:
        print("[*] Production mode enabled; synthetic cohort seeding is disabled.")
        yield
        print("[*] Sahayak Backend shutting down...")
        return

    print("[*] Initializing Sahayak Synthetic Cohort Engine (1,200 longitudinal personnel)...")
    df = cohort_manager.generate_cohort(n_samples=1200)
    print(f"[+] Generated {len(df)} personnel across 4 operational contexts.")

    print("[*] Training HR Operational Risk Model & Calibration Baselines...")
    hr_risk_engine.train_model(df)
    print("[+] Model trained & robust z-score calibration active.")

    high_stress = df[df["latent_stress_index"] > 0.65]
    if len(high_stress) == 0:
        seed_samples = df.sort_values(by="latent_stress_index", ascending=False).head(min(4, len(df)))
    else:
        seed_samples = high_stress.head(min(4, len(high_stress)))
    tiers = ["critical", "elevated", "elevated", "emerging"]
    reasons_list = [
        ["RC_ACUTE_DISTRESS_MARKER", "RC_SUSTAINED_DEPLOYMENT", "RC_SLEEP_DEGRADATION_TREND"],
        ["RC_POST_LEAVE_VULNERABILITY", "RC_DENIED_LEAVE_CLUSTER"],
        ["RC_NIGHT_SHIFT_OVERLOAD", "RC_MOOD_TRAJECTORY_DROP"],
        ["RC_SOMATIC_FATIGUE_CLUSTER", "RC_FREQUENT_TRANSFER"]
    ]

    with SessionLocal() as db:
        for idx, (_, row) in enumerate(seed_samples.iterrows()):
            tier = tiers[idx % len(tiers)]
            case_id = f"CASE-{row['pseudonym_id'][:8].upper()}"
            if db.get(CaseRecord, case_id):
                continue
            reason_codes = reasons_list[idx % len(reasons_list)]
            db.add(CaseRecord(
                case_id=case_id,
                pseudonym_id=row["pseudonym_id"],
                tier=tier,
                origin="device_fusion" if idx != 2 else "hr_channel",
                reason_codes=reason_codes,
                opened_at="2026-09-11T09:30:00Z",
                status="open",
                unit_context=row["unit_name"],
                h_band=4 if tier == "critical" else (3 if tier == "elevated" else 2),
                has_acute_marker="RC_ACUTE_DISTRESS_MARKER" in reason_codes,
            ))
            db.commit()
            audit_ledger.append_log(
                actor_role="system_seed",
                actor_id="bootstrap",
                action="INITIAL_TRIAGE_CASE_SEEDED",
                case_id=case_id,
                pseudonym_id=row["pseudonym_id"],
                metadata={"tier": tier, "unit": row["unit_name"]}
            )

    print("[+] Seeded initial demonstration cases in Welfare Case Store.")
    yield
    print("[*] Sahayak Backend shutting down...")

app = FastAPI(
    title="Sahayak AI - Personnel Welfare Intelligence Platform",
    description="Privacy-Preserving Multi-Tier Stress & Personnel Welfare Intelligence System",
    version="1.0.0",
    lifespan=lifespan
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(device_router, dependencies=[Depends(get_current_user)])
app.include_router(welfare_router, dependencies=[Depends(get_current_user)])
app.include_router(command_router, dependencies=[Depends(get_current_user)])
app.include_router(identity_router, dependencies=[Depends(get_current_user)])
app.include_router(audit_router, dependencies=[Depends(get_current_user)])

@app.get("/")
def root():
    return {
        "service": "Sahayak AI Core API",
        "status": "operational",
        "privacy_invariants": {
            "on_device_processing": "Z0 Enforced",
            "k_anonymity_minimum_n": 20,
            "reason_codes_whitelist_only": True,
            "hash_chain_audit_active": True
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
