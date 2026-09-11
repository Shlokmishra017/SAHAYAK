"""
Sahayak Personnel Welfare Intelligence Platform - Backend Entrypoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ml.synthetic_generator import cohort_manager
from app.ml.hr_risk_model import hr_risk_engine
from app.routes.device_api import router as device_router, ACTIVE_CASES
from app.routes.welfare_api import router as welfare_router
from app.routes.command_api import router as command_router
from app.routes.identity_api import router as identity_router
from app.routes.audit_api import router as audit_router
from app.routes.auth_api import router as auth_router
from app.core.audit_chain import audit_ledger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Generate cohort, train HR risk model, initialize demo cases
    print("[*] Initializing Sahayak Synthetic Cohort Engine (1,200 longitudinal personnel)...")
    df = cohort_manager.generate_cohort(n_samples=1200)
    print(f"[+] Generated {len(df)} personnel across 4 operational contexts.")
    
    print("[*] Training HR Operational Risk Model & Calibration Baselines...")
    hr_risk_engine.train_model(df)
    print("[+] Model trained & robust z-score calibration active.")

    # Seed 4 initial realistic cases for the Welfare Officer queue demo
    seed_high_stress_samples = df[df["latent_stress_index"] > 0.65].head(4)
    tiers = ["critical", "elevated", "elevated", "emerging"]
    reasons_list = [
        ["RC_ACUTE_DISTRESS_MARKER", "RC_SUSTAINED_DEPLOYMENT", "RC_SLEEP_DEGRADATION_TREND"],
        ["RC_POST_LEAVE_VULNERABILITY", "RC_DENIED_LEAVE_CLUSTER"],
        ["RC_NIGHT_SHIFT_OVERLOAD", "RC_MOOD_TRAJECTORY_DROP"],
        ["RC_SOMATIC_FATIGUE_CLUSTER", "RC_FREQUENT_TRANSFER"]
    ]

    for idx, (_, row) in enumerate(seed_high_stress_samples.iterrows()):
        tier = tiers[idx]
        case_id = f"CASE-{row['pseudonym_id'][:8].upper()}"
        ACTIVE_CASES[case_id] = {
            "case_id": case_id,
            "pseudonym_id": row["pseudonym_id"],
            "tier": tier,
            "origin": "device_fusion" if idx != 2 else "hr_channel",
            "reason_codes": reasons_list[idx],
            "opened_at": "2026-09-11T09:30:00Z",
            "closed_at": None,
            "status": "open",
            "unit_context": row["unit_name"],
            "h_band": 4 if tier == "critical" else (3 if tier == "elevated" else 2),
            "has_acute_marker": "RC_ACUTE_DISTRESS_MARKER" in reasons_list[idx],
            "officer_label": None,
            "interventions": []
        }
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(device_router)
app.include_router(welfare_router)
app.include_router(command_router)
app.include_router(identity_router)
app.include_router(audit_router)

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
