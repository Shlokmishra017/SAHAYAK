# Sahayak Deployment (Phase 4)

Reproducible local production-like stack: Frontend → API → PostgreSQL.
SQLite remains available for local development only.

## Quick start (requires Docker)

```text
cp backend/.env.example backend/.env   # then set JWT_SECRET, custodian PINs
export POSTGRES_PASSWORD=<strong password>   # PowerShell: $env:POSTGRES_PASSWORD="..."
docker compose up --build
```

- Web UI: http://localhost:8080 (`/v1` proxied to the API).
- API direct: http://localhost:8000 (`/health`, `/ready`).
- DB: PostgreSQL 16 with a named `pgdata` volume.

> Not yet run against a Docker daemon in this workspace (none available);
> verify `docker compose up --build` before demo day.

## Schema management

Production schema is managed by Alembic, not `create_all()`:

```text
cd backend
alembic upgrade head     # baseline 0001 covers all Phase 1-3 tables
alembic check            # metadata-vs-migration drift check (CI runs this)
```

The API container runs `alembic upgrade head` before uvicorn on startup
(safe startup). SQLite dev databases keep working via `init_db()` plus
additive column guards.

## Health and readiness

- `GET /health` — process health (always 200 when the process runs).
- `GET /ready` — verifies database connectivity (503 when unreachable).
  Compose uses `/ready` for the API healthcheck; `web` waits for healthy `api`.

## Dependencies

- Backend pinned: `backend/requirements.lock` (`uv pip compile`, Python 3.12).
- Frontend pinned: `frontend/package-lock.json` (`npm ci` in Docker + CI).

## CI

`.github/workflows/ci.yml` runs: backend install + tests + import check +
Alembic check + eval smoke; frontend `npm ci` + build; a security scan that
fails on committed `.env`/`.db` files or hardcoded credentials (one
explicitly marked seeded-demo line excepted).
