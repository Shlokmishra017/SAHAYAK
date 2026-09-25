# SAHAYAK Monolithic Deployment Guide

## Overview

SAHAYAK is packaged as a **True Monolithic Web Application** deployable as a single container / web service exposing a single public URL.

```text
                    ONE APPLICATION
                         │
                    ONE SERVER
                         │
              ┌──────────┴──────────┐
              │                     │
          Frontends              FastAPI
       (Main UI + v0 UI)        (API & Auth)
              │                     │
              └──────────┬──────────┘
                         │
                    SQLite DB
               (Auto-initialized)
```

## Features

- **Single Service / Single Public URL:** No separate frontend and backend deployments, no CORS issues, no separate databases required.
- **Both Frontends Integrated:**
  - Primary Operational Platform available at `/` (Role-based login, Welfare cases, Commander strategic views, Cryptographic audit ledger, Jawan wellness suite, HRMS import).
  - Executive Design Showcase (v0 prototype) available at `/v0` (and `/preview`).
  - Seamless navigation toggles between both frontends.
- **Embedded Database:** SQLite with automated Alembic migrations and instant synthetic cohort/demo case seeding.
- **Zero-Config Hackathon Deploy:** Container runs out of the box with zero mandatory environment variables.
- **Cloud Native:** Dynamically binds to `0.0.0.0:$PORT` (compatible with Render, Railway, Fly.io, Cloud Run).

---

## Local Docker Deployment

### 1. Build the Container
```bash
docker build -t sahayak .
```

### 2. Run the Container
```bash
docker run -p 8000:8000 sahayak
```

### 3. Access the Application
- **Main Web Application:** http://localhost:8000/
- **Executive View (v0):** http://localhost:8000/v0
- **Interactive API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health
- **Readiness Check:** http://localhost:8000/ready

---

## Render Deployment Settings (Step-by-Step)

Deploying SAHAYAK to [Render.com](https://render.com) takes under 2 minutes:

1. Log in to Render and click **New +** → **Web Service**.
2. Connect your GitHub repository: `Shlokmishra017/SAHAYAK`.
3. Configure the service settings:
   - **Name:** `sahayak` (or any desired name)
   - **Region:** Any (e.g., Singapore, Frankfurt, Oregon)
   - **Branch:** `main`
   - **Root Directory:** (leave empty / defaults to repo root)
   - **Runtime:** **Docker**
   - **Instance Type:** Free (512MB RAM) or Starter
4. **Environment Variables:**
   - **None required!** The application ships with safe, functional defaults for demo evaluations.
   - *(Optional Production Overrides):*
     - `DEMO_MODE=true` (enables synthetic cohort and seeded demonstration cases)
     - `JWT_SECRET=your-secure-random-32-plus-character-secret`
5. Click **Create Web Service**.
6. Render builds the multi-stage Docker container, starts Uvicorn bound to `$PORT`, and assigns your single public URL (e.g. `https://sahayak.onrender.com`).

---

## Railway & Fly.io Deployment

- **Railway:** Click "Deploy from GitHub repo" → Railway automatically detects `Dockerfile` and deploys to a single public domain.
- **Fly.io:** Run `fly launch` in the workspace root → Fly detects the `Dockerfile` and configures port 8000.

---

## Verified Seeded Demo Personas

On the login page (`/login`), click any quick-fill button or enter:

| Persona | Role | Service ID | Default Password |
|---|---|---|---|
| **Priya Shah / Meera Nair** | Unit Welfare Officer | `WO-7742` | `ServicePass@2026` |
| **Col. R. V. Deshmukh** | Sector Commander | `CMD-1082` | `ServicePass@2026` |
| **Alok Verma** | Systems & Compliance Auditor | `AUD-9901` | `ServicePass@2026` |
| **Vikram Singh** | Force Personnel (Jawan) | `CAPF-849201` | `ServicePass@2026` |

---

## Dual-Custody Break-Glass Demo PINs

| Custodian Role | Identifier | Default PIN |
|---|---|---|
| Welfare Officer | `WO_7742` | `9481` |
| Medical Officer | `MO_3109` | `6205` |
| Adjutant | `ADJ_102` | `8821` |
