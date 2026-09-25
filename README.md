<div align="center">

# 🇮🇳 SAHAYAK (सहायक)
### Privacy-First AI-Driven Personnel Stress & Operational Welfare Platform
**Built for the Central Armed Police Forces (CAPF) & Armed Forces**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_%2F_SQLite-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![Privacy Architecture](https://img.shields.io/badge/Privacy-k--Anonymity_%26_Dual--Custody-success?style=flat-square)](#core-architectural-pillars--privacy-safeguards)

*A proactive, technology-driven platform designed to identify early indicators of stress, emotional fatigue, and operational burnout while uncompromisingly preserving personnel privacy, dignity, and trust.*

</div>

---

## 📌 Executive Summary

Personnel in the **Central Armed Police Forces (CRPF, BSF, ITBP, CISF, SSB, Assam Rifles)** and **Armed Forces** operate under intense psychological stress: extended frontline deployments, high-altitude exposure, counter-insurgency operations, prolonged separation from families, and irregular duty rosters.

Traditionally, mental health monitoring relies on **post-facto manual observations or stigmatized self-reporting**, which often delays timely intervention until a crisis occurs.

**SAHAYAK (सहायक)** bridges this gap by providing an end-to-end welfare platform that combines:
1. **Confidential, on-device self-assessment** for troops (Zone 0).
2. **Objective operational risk modeling** based on service parameters (leave denial, duty cycles, deployment severity).
3. **k-Anonymized macro-level situational awareness** for Commanders (preventing troop surveillance).
4. **Dual-custodian break-glass protocol** to de-anonymize cases only under genuine acute crisis.
5. **Tamper-evident SHA-256 audit ledger** ensuring absolute cryptographic accountability.

> **Crucial Principle:** SAHAYAK is strictly a **welfare-support triage tool**, **never a disciplinary or surveillance system**. Individual raw entries and scores are never accessible to operational commanders.

---

## 🛡️ Core Architectural Pillars & Privacy Safeguards

SAHAYAK enforces strict mathematical and architectural boundaries between personnel, welfare officers, and military commanders.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ZONE 0: PERSONNEL CONFIDENTIAL PWA                  │
│  - Offline-first PWA with IndexedDB Local Enclave                     │
│  - Local multilingual lexicons (Hindi, English, Marathi, Punjabi)     │
│  - Raw journal text NEVER leaves the device                          │
│  - Airplane-mode support & manual secure outbox sync                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Aggregated Indicators / Redacted
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               ZONE 1: SECURE BACKEND & IDENTITY BROKER                │
│  - FastAPI REST Gateway with strict RBAC & Per-IP Rate Limiting       │
│  - ML Risk Engine: Gradient Boosting + Unit-Relative Calibration      │
│  - SHA-256 Cryptographic Chained Audit Ledger                         │
│  - Dual-Custodian Break-Glass Engine (Requires 2 Officer Signatures)  │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │ Minimum Necessary Case Disclosure      │ k-Anonymized Aggregates
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     WELFARE OFFICER CORE      │        │     COMMANDER STRATEGY        │
│  - De-identified Case IDs     │        │  - Strict k-Anonymity (k ≥ 20)│
│  - Explainable Reason Codes   │        │  - Small Cohort Suppression   │
│  - Intervention Tracking      │        │  - Zero Individual Visibility │
│  - Direct Self-Referral Queue │        │  - Heatmaps & Morale Index    │
└───────────────────────────────┘        └───────────────────────────────┘
```

### 1. Zone 0 (Personnel Confidentiality)
- **Local-First Enclave:** Deployed as a Progressive Web App (PWA). Personnel self-assessments, daily pulse checks, and voice/text journals are analyzed **client-side**.
- **Zero Raw Text Upload:** Only calculated numerical indices or self-referral signals are transmitted. Raw journals remain in client-side IndexedDB.
- **Multilingual Support:** Local lexicon matching supporting English, Hindi (हिंदी), Marathi (मराठी), and Punjabi (ਪੰਜਾਬੀ).

### 2. Strict k-Anonymity & Small-Cohort Suppression (k ≥ 20)
- Commanders view unit-level wellness heatmaps, leave trends, and operational strain indices.
- **Automatic Suppression:** If a sub-unit cohort has fewer than 20 personnel ($k < 20$), metrics are automatically suppressed and grouped with higher-echelon data to make individual re-identification mathematically infeasible.

### 3. Dual-Custodian Break-Glass Protocol
- When an urgent self-referral or high acute distress marker triggers, the Welfare Officer sees an anonymized token (e.g., `CASE-4A9B`).
- To reveal the soldier's identity for immediate physical medical dispatch, **two distinct authorized custodians** (e.g., Unit Welfare Officer + Medical Officer / Adjutant) must concurrently authenticate with their identity and personal security PINs.
- Identity tokens have a **15-minute Time-To-Live (TTL)** before self-expiring, and every attempt is permanently recorded on the blockchain-inspired audit ledger.

### 4. Cryptographic SHA-256 Audit Ledger
- Every critical system action (login, break-glass initiation, case status update, manual referral) is committed to a forward-linked SHA-256 hash chain.
- Includes a dedicated **Auditor Role** equipped with cryptographic tamper-detection tools and simulated tamper drills.

---

## 👥 Demo User Personas & Credentials

The platform comes pre-seeded with 4 distinct operational roles to demonstrate all access tiers.

> **Default Password for All Demo Accounts:** `ServicePass@2026`

| Role | Name | Service ID | Clearance / Interface | What They Can See |
|:---|:---|:---|:---|:---|
| **Z0 Personnel** | Constable Vikram Singh | `CAPF-849201` | **Confidential Jawan Suite** | Self-assessment, private journal, offline exercises, confidential self-referral. |
| **Z1 Welfare Officer** | Capt. Meera Nair | `WO-7742` | **Unit Welfare Triage Core** | Anonymized active cases, explainable risk reasons, intervention logs, break-glass requests. |
| **Z1 Commander** | Col. R. V. Deshmukh | `CMD-1082` | **Sector Strategic View** | Macro trends, battalion cohesion index, k-suppressed heatmaps. *Zero individual records.* |
| **Auditor** | Inspector Alok Verma | `AUD-9901` | **Cryptographic Audit Bureau** | Complete SHA-256 hash-chain ledger, block verifier, tamper simulation engine. |

---

## 🧠 Machine Learning Risk Model

SAHAYAK utilizes an explainable operational risk engine (`sahayak-hr-gbr-v2.0-synthetic`) designed around operational reality rather than black-box scoring.

- **Algorithm:** `scikit-learn` Gradient Boosting Regressor (GBR) trained against 1,200 longitudinal synthetic personnel across 4 operational contexts (High-Altitude Frontline, CI/Counter-Terrorism, Static Garrison, Peacetime Logistics).
- **Inputs:** Service duration, consecutive field days, continuous night shifts, leave rejection history, domestic distress flags, and voluntary wellness pulse scores.
- **Unit-Relative Calibration:** Calibrated against battalion baselines to prevent flagging entire high-stress units while surfacing individuals with relative anomalies.
- **Explainable Reason Codes:** Every elevated case provides rule-based operational explanations (e.g., `RC_SUSTAINED_DEPLOYMENT`, `RC_CONSECUTIVE_LEAVE_DENIAL`, `RC_SLEEP_DEGRADATION_TREND`).
- **Performance:** ROC-AUC: **0.883** | Precision: **0.429** | Recall: **0.160** | F1: **0.233** (on synthetic benchmark at operational cut $\text{band} \ge 3$).
- *Full details in [docs/ModelCard.md](docs/ModelCard.md).*

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Git**

### Option A: One-Command Start (Windows)
Run the root batch script or python unified runner:
```cmd
# Double click start.bat or run via terminal:
start.bat
```
*Or using Python:*
```bash
python run.py
```
This automatically boots both the FastAPI backend (`:8000`) and the Vite frontend (`:5173`), configuring live output streaming and auto-kill on `Ctrl+C`.

---

### Option B: Manual Setup

#### 1. Backend Service
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run backend development server
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

#### 2. Frontend Web Application
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- Web Application: `http://localhost:5173`

---

### Option C: Docker Compose (Full Stack)
```bash
# Ensure POSTGRES_PASSWORD and JWT_SECRET are set
docker compose up --build
```
- Web Application: `http://localhost:8080`
- API Direct: `http://localhost:8000`

---

## 🧪 Testing & Verification

The codebase includes an exhaustive test suite covering backend logic, frontend components, cryptographic chains, and operational failure scenarios.

```bash
# 1. Run all Backend Pytest Suites (40 tests)
cd backend
pytest tests/ -v

# 2. Run Operational Failure Drills (9 live resilience scenarios)
python tests/failure_drill.py

# 3. Run Frontend Unit & Component Tests (Vitest)
cd ../frontend
npm run test

# 4. Evaluate ML Model Metrics on Held-Out Split
cd ../backend
python eval_model.py --seed 42 --n 1200
```

---

## 📁 Repository Structure

```
Sahayak/
├── backend/                  # FastAPI Application Core
│   ├── app/
│   │   ├── core/            # Auth, database, config, SHA-256 audit ledger
│   │   ├── ml/              # HR Risk GBR model & synthetic cohort generator
│   │   ├── routes/          # REST endpoints (auth, device, welfare, command, audit, hrms)
│   │   └── main.py          # FastAPI application entrypoint & startup hooks
│   ├── tests/               # Pytest suites, failure drills, performance benchmarks
│   ├── Dockerfile           # Backend container spec
│   └── requirements.txt     # Python production dependencies
├── frontend/                 # Production React + Vite + Tailwind PWA
│   ├── src/
│   │   ├── components/      # UI components & persona dashboards (Jawan, Welfare, Commander, Auditor)
│   │   ├── services/        # API client, offline outbox, local crypto enclave
│   │   └── App.jsx          # Root view with role-based routing
│   ├── Dockerfile           # Frontend Nginx container spec
│   └── package.json         # Node.js dependencies & scripts
├── docs/                     # Comprehensive Engineering & Compliance Docs
│   ├── Architecture.md      # Detailed system architecture diagram & components
│   ├── ModelCard.md         # Full ML model specification, metrics, and fair-use guidance
│   ├── ThreatModel.md       # STRIDE-based threat modeling & mitigation analysis
│   ├── Limitations.md       # Explicit technical, operational, and clinical boundaries
│   ├── DataRetention.md     # Data purging, encryption, and right-to-erasure policies
│   ├── HrmsIngestion.md     # Secure HRMS CSV pipeline specification
│   └── FailureDrills.md     # Breakdown of the 9 simulated system failure drills
├── docker-compose.yml        # Multi-container production deployment specification
├── run.py                    # Unified concurrent development server launcher
├── start.bat                 # Windows one-click developer startup script
└── README.md                 # Primary project documentation
```

> *Note: `v0frontend/` is an early prototype directory kept for architectural reference; the active, verified client resides in `frontend/`.*

---

## 📑 In-Depth Documentation

For rigorous evaluators and technical auditors, detailed specifications are available in the [`docs/`](docs/) directory:

| Document | Purpose |
|:---|:---|
| 📄 [**Architecture.md**](docs/Architecture.md) | Component interaction diagram, data flow boundaries, and trust zones. |
| 📄 [**ModelCard.md**](docs/ModelCard.md) | ML architecture, synthetic cohort generation, precision/recall analysis, and failure boundaries. |
| 📄 [**ThreatModel.md**](docs/ThreatModel.md) | 10 threat scenarios (collusion, DB compromise, rogue commanders) and cryptographic mitigations. |
| 📄 [**Limitations.md**](docs/Limitations.md) | Uncompromised honesty regarding synthetic training data, PWA platform constraints, and non-clinical scope. |
| 📄 [**DataRetention.md**](docs/DataRetention.md) | Granular data retention limits and personnel right-to-erasure workflows. |
| 📄 [**HrmsIngestion.md**](docs/HrmsIngestion.md) | Secure batch CSV ingestion specifications and validation schemas. |
| 📄 [**FailureDrills.md**](docs/FailureDrills.md) | Operational resilience drills verifying database drop recovery, tamper detection, and key rotation. |

---

## ⚖️ Ethical AI & Limitations Notice

- **Non-Clinical Scope:** SAHAYAK is a **workforce welfare triage system**. It does **NOT** provide clinical psychological or psychiatric diagnoses.
- **Synthetic Training Data:** In compliance with defense secrecy and ethics, all models and cohorts are trained and evaluated on mathematically generated synthetic personas. No real personnel service records were harvested or leaked.
- **Non-Punitive Mandate:** The system is architected to prevent disciplinary exploitation. Command personnel have access only to statistical distributions with strict $k$-anonymity ($k \ge 20$).

---

<div align="center">
  <b>Developed for Operational Welfare, Resilience, and Force Protection.</b>
</div>
