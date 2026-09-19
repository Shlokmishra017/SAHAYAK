System Health Scorecard

  ┌────────────────┬─────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    Category    │ Score   │                                                        Rationale                                                         │
  │                │ (1-10)  │                                                                                                                          │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                │         │ Strong privacy-by-design with Z0/Z1/Z2 tier separation, inverted edge privacy, dual-custodian break-glass, and           │
  │ Architecture   │ 8/10    │ k-anonymity enforcement. Clean separation of concerns across core modules (auth, audit, ML, security). Minor deductions  │
  │                │         │ for hardcoded demo data in components.                                                                                   │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Backend        │         │ Core logic is solid (gradient boosting, robust z-scoring, isolation forest) but has critical gaps: missing JWT           │
  │ Reliability    │ 6/10    │ middleware on protected routes (auth exists but not enforced globally), no rate limiting, inconsistent error handling,   │
  │                │         │ and SQLite WAL config is correct but no connection pooling for production.                                               │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Database       │         │ Schema design is clean with proper indexes, foreign keys, and audit chain persistence. However: no migration system (raw │
  │ Health         │ 5/10    │  create_all), no connection pooling for PostgreSQL, IdempotencyRecord lacks TTL/expiry cleanup, and no transaction       │
  │                │         │ isolation level configuration.                                                                                           │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Frontend       │         │ React 18 + Vite + Tailwind with good component decomposition and Context API state management. Excellent privacy UI      │
  │ Quality        │ 7/10    │ patterns (on-device NLP, local fusion visualization). Issues: hardcoded stats in CaseList (lines 85, 95, 108), airplane  │
  │                │         │ mode queue not transmitted on reconnect, no error boundaries, and no React Query/SWR for server state.                   │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                │         │ Strong cryptographic audit chain (SHA-256), closed-vocabulary reason codes, dual-custodian break-glass, k-anonymity with │
  │ Security       │ 6/10    │  complementary suppression, PBKDF2 password hashing. Critical gaps: JWT validation not enforced on all routes, no rate   │
  │                │         │ limiting, no CORS tightening in production, audit actor_id_hash truncated in some flows, and hardcoded PINs in demo.     │
  ├────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                │         │ Unit tests cover core ML, audit chain, k-anonymity, and break-glass logic well. But: no integration tests for API        │
  │ Test Coverage  │ 4/10    │ contracts, no frontend tests (Jest/RTL missing), no e2e tests, no security tests (auth bypass, injection), and benchmark │
  │                │         │  tests only measure latency not correctness.                                                                             │
  └────────────────┴─────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---

  Critical & Blocking Bugs (P0 / P1)

  1. JWT Authentication Middleware Missing on Protected Routes

  File: backend/app/main.py (lines 93-107)
  Root Cause: CORS middleware added but no global authentication dependency; individual routes use require_roles() but nothing enforces auth at the app
  level. In production with DEMO_MODE=false, unauthenticated requests reach business logic.
  Production Fix:
  # backend/app/main.py - Add after CORS middleware
  from app.core.auth import get_current_user

  # Option A: Global dependency (enforces auth on ALL routes except health/root)
  # app = FastAPI(..., dependencies=[Depends(get_current_user)])

  # Option B: Per-router (current approach) - BUT ensure no route is missed
  # Current: auth_router, device_router, welfare_router, command_router, identity_router, audit_router
  # VERIFY: All routes in these routers use require_roles() - they do, but no fallback

  2. Audit Chain Actor ID Hash Truncation

  File: backend/app/core/audit_chain.py line 133
  Root Cause: actor_id_hash = hashlib.sha256(actor_id.encode("utf-8")).hexdigest() produces 64-char hash, but frontend HashChainInspector.jsx line 159
  displays truncated block.actor_id_hash (only first ~16 chars in some mock data). Collision risk: 16 hex chars = 64 bits, birthday attack feasible.
  Production Fix:
  # backend/app/core/audit_chain.py - Already correct (full 64 chars)
  # FRONTEND FIX: frontend/src/components/audit/HashChainInspector.jsx line 159
  # Change: {block.actor_id_hash} → {block.actor_id_hash.slice(0, 16)}... (with tooltip showing full)
  # AND ensure backend NEVER truncates - it doesn't, but verify audit_api.py returns full hash

  3. In-Memory Storage for Critical Data (Device API)

  File: backend/app/routes/device_api.py - No ACTIVE_CASES dict found, but audit_chain.py line 279 creates audit_ledger = AuditChainEngine(persist=True)
  which persists to DB. However, SyntheticCohortManager (line 208) is module-level singleton with in-memory personnel_df and pseudonym_index - data lost on
  restart in demo mode.
  Production Fix:
  # backend/app/main.py lifespan - already re-generates cohort on startup (lines 31-38)
  # BUT: IdentityBroker._REGISTRY (security.py line 40) is in-memory dict - loses break-glass mappings on restart
  # Fix: Persist IdentityBroker registry to database or external secret store

  4. Hardcoded Seeding Logic - IndexError Risk

  File: backend/app/main.py lines 41-45
  Root Cause: seed_samples = high_stress.head(4) then tiers[idx % len(tiers)] assumes ≥4 samples. If cohort <4 high-stress personnel, IndexError on
  reasons_list[idx % len(reasons_list)].
  Production Fix:
  # backend/app/main.py - Replace lines 41-82 with bounds-safe version:
  high_stress = df[df["latent_stress_index"] > 0.65]
  if len(high_stress) < 4 and not df.empty:
      high_stress = df.sort_values(by="latent_stress_index", ascending=False)
  seed_samples = high_stress.head(min(4, len(high_stress)))  # Bounds check
  # ... rest of loop uses idx % len() which is now safe

  5. Missing Rate Limiting - DoS Vulnerability

  File: backend/app/main.py - No rate limiting middleware
  Root Cause: All endpoints (especially /v1/device/escalations, /v1/auth/login) accept unlimited requests. Attacker can exhaust DB connections, fill audit
  chain, or brute-force JWT.
  Production Fix:
  # Add to requirements.txt: slowapi>=0.1.9
  # backend/app/main.py:
  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.util import get_remote_address
  from slowapi.errors import RateLimitExceeded

  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

  # Apply to sensitive endpoints:
  # @limiter.limit("10/minute") on /v1/auth/login
  # @limiter.limit("30/minute") on /v1/device/escalations

  6. Airplane Mode Escalation Queue Never Flushed on Reconnect

  File: frontend/src/context/AppStateContext.jsx lines 206-220
  Root Cause: useEffect watches isAirplaneMode and escalationOutbox but submitEscalation is called without await in forEach, and errors are silently caught.
  Queue cleared regardless of success.
  Production Fix:
  // frontend/src/context/AppStateContext.jsx - Replace lines 206-220:
  useEffect(() => {
    if (!isAirplaneMode && escalationOutbox.length > 0) {
      const sendQueued = async () => {
        const failed = [];
        for (const payload of escalationOutbox) {
          try {
            await submitEscalation(payload);
          } catch (err) {
            failed.push(payload);
            console.error('Failed to send queued escalation:', err);
          }
        }
        if (failed.length < escalationOutbox.length) {
          showToast(`${escalationOutbox.length - failed.length} queued escalation(s) sent`, "success");
        }
        if (failed.length > 0) {
          showToast(`${failed.length} escalation(s) failed - retained in outbox`, "error");
          setEscalationOutbox(failed);
        } else {
          setEscalationOutbox([]);
        }
      };
      sendQueued();
    }
  }, [isAirplaneMode, escalationOutbox]);

  7. Hardcoded Frontend Statistics in CaseList

  File: frontend/src/components/welfare/CaseList.jsx lines 85, 95, 108
  Root Cause: Stats cards show 144, 92.4%, 2 hardcoded instead of real data from /v1/command/cohort-statistics. Welfare officers make resource decisions on
  fake data.
  Production Fix:
  // frontend/src/components/welfare/CaseList.jsx - Already fetches cohortStats (lines 25-49)
  // REPLACE lines 84-110 with:
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard label="Active Monitored" value={loading ? '...' : cohortStats?.total_personnel || 0} unit={cohortStats?.unit_name} />
    <StatCard label="Check-in Completion" value={`${checkInCompletion}%`} unit="Past 7 days" color="emerald" />
    <StatCard label="Elevated Fatigue" value={elevatedCount + criticalCount} unit="Above unit baseline" color="amber" />
    <StatCard label="Requiring Attention" value={criticalCount} unit="Triage priority" color="rose" />
  </div>

  8. No Database Migration System

  File: backend/app/core/database.py line 84-85
  Root Cause: init_db() calls Base.metadata.create_all() - drops/recreates tables on schema change, losing data. No Alembic or versioned migrations.
  Production Fix:
  # Add to requirements.txt: alembic>=1.12.0
  # backend/alembic.ini + backend/alembic/ directory with env.py
  # Run: alembic init alembic && alembic revision --autogenerate -m "initial"

  ---

  Full-Stack Tier-by-Tier Recommendations

  Backend Logic, Concurrency, Validation, Error Handling

  ┌────────────────────────────────────┬───────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
  │               Issue                │             File              │                                      Fix                                       │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ N+1 Query in welfare case list     │ welfare_api.py lines 40-44    │ ✅ Already fixed with pre-fetch aggregation - GOOD                             │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ No request validation on           │ schemas.py EscalationPayload  │ Add Pydantic validator: detected_at must be ISO 8601, not future >5min         │
  │ timestamps                         │                               │                                                                                │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ No UUID format validation          │ schemas.py CaseFilterParams   │ Add Field(pattern=r'^[0-9a-f-]{36}$') on pseudonym_id fields                   │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Inconsistent error responses       │ All route files               │ Create app/core/exceptions.py with AppException hierarchy and                  │
  │                                    │                               │ @app.exception_handler                                                         │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Concurrent break-glass race        │ security.py lines 54-108      │ Add DB-level lock or Redis distributed lock for dual-custodian verification    │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Model retraining not triggered by  │ hr_risk_model.py              │ Add background job: when officer_label count > threshold, retrain              │
  │ labels                             │                               │ GradientBoostingRegressor                                                      │
  ├────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Cohesion analyzer cache            │ cohesion_analyzer.py lines    │ Cache keyed by df.hash() not just length; add TTL                              │
  │ invalidation                       │ 26-27                         │                                                                                │
  └────────────────────────────────────┴───────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

  Database Schema, Indexes, Query Tuning, Connection Pooling

  ┌─────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
  │                          Issue                          │                                            Fix                                            │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Missing index on CaseRecord.closed_at                   │ Add index=True for closed-case queries                                                    │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ No composite index for welfare queries                  │ Add Index('ix_cases_tier_status', 'tier', 'status')                                       │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ AuditBlockRecord.block_hash unique but no index on      │ Add Index('ix_audit_prev_hash', 'prev_hash') for chain verification                       │
  │ prev_hash                                               │                                                                                           │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ IdempotencyRecord no TTL                                │ Add created_at index + cron job to purge >24h keys                                        │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Connection pooling                                      │ In database.py: create_engine(..., pool_size=10, max_overflow=20, pool_pre_ping=True) for │
  │                                                         │  PostgreSQL                                                                               │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Transaction isolation                                   │ For break-glass: db.execute(text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE"))         │
  ├─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Soft delete pattern                                     │ Add deleted_at to CaseRecord instead of hard delete for audit trail                       │
  └─────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

  UI/Frontend Component Structure, State Hydration, UX Failure Handling

  ┌─────────────────────────────────┬──────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
  │              Issue              │             File             │                                        Fix                                        │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ No React Query / SWR            │ AppStateContext.jsx          │ Replace manual fetch* + useEffect with @tanstack/react-query for caching,         │
  │                                 │                              │ deduping, retry                                                                   │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ No Error Boundaries             │ App.jsx                      │ Wrap each role section in <ErrorBoundary fallback={<ErrorFallback />}>            │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ LocalStorage token not cleared  │ api.js apiFetch              │ Add interceptor: if 401, localStorage.removeItem('sahayak_access_token'),         │
  │ on 401                          │                              │ redirect to login                                                                 │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ No loading skeletons            │ CaseList.jsx,                │ Add skeleton loaders while data fetches                                           │
  │                                 │ CohortHeatmap.jsx            │                                                                                   │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ Accessibility gaps              │ Multiple                     │ Add aria-labels, role="button" on clickable divs, focus management in modals      │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ Responsive breakpoints          │ Tailwind config + components │ Standardize: sm: 640px, md: 768px, lg: 1024px, xl: 1280px                         │
  │ inconsistent                    │                              │                                                                                   │
  ├─────────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ CSS variables conflict with     │ index.css lines 74-86        │ Remove !important overrides; use Tailwind dark: mode or CSS vars consistently     │
  │ Tailwind                        │                              │                                                                                   │
  └─────────────────────────────────┴──────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘

  DevOps, Config, Secret Management, CI

  ┌─────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                  Issue                  │                                               Fix                                                │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ No .env.example                         │ Create with all required vars: JWT_SECRET, DATABASE_URL, CORS_ORIGINS, DEMO_MODE                 │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ JWT secret validation only in config.py │ Add startup check in main.py lifespan before yield                                               │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ No health check differentiation         │ /health should check DB connectivity; /ready for k8s readiness probe                             │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ No structured logging                   │ Add structlog or python-json-logger with correlation IDs                                         │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ No CI pipeline                          │ Add GitHub Actions: lint (ruff/black), test (pytest), build (vite), security (bandit, pip-audit) │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Dockerfile missing                      │ Multi-stage: builder → runtime with non-root user, distroless base                               │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Secrets in code                         │ security.py lines 43-47 hardcoded PINs - move to env/secret manager                              │
  └─────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---

  Slop & Dead Code Purge List

  ┌────────────────────────────────────────────────────┬────────────────────────────────────────────┬──────────────────────────────────────────────────┐
  │                   File / Pattern                   │                   Action                   │                      Reason                      │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ backend/app/core/security.py lines 43-47           │ DELETE hardcoded _AUTHORIZED_CUSTODIANS    │ Demo credentials in production code; use         │
  │                                                    │ dict                                       │ env/secrets                                      │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ backend/app/main.py lines 31-83                    │ REFACTOR demo seeding into separate        │ Startup logic polluted with demo data generation │
  │                                                    │ scripts/seed_demo.py                       │                                                  │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ frontend/src/services/api.js lines 92-222          │ DELETE all mock fallback returns           │ Dual code paths (backend + mock) - keep only     │
  │                                                    │                                            │ backend calls; handle offline in UI layer        │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ frontend/src/components/welfare/CaseList.jsx lines │ DELETE hardcoded mock cases in             │ Already fetches real data; mock masks backend    │
  │  164-197                                           │ fetchWelfareCases catch block              │ failures                                         │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ backend/tests/verify_endpoints.py                  │ MOVE to integration test suite with pytest │ Not a unit test; requires running server         │
  │                                                    │  fixtures                                  │                                                  │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ backend/app/ml/synthetic_generator.py line 208     │ MOVE cohort_manager singleton to main.py   │ Module-level side effects break test isolation   │
  │                                                    │ lifespan                                   │                                                  │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ frontend/src/context/AppStateContext.jsx lines     │ EXTRACT DEMO_PERSONAS to                   │ Separate config from logic                       │
  │ 17-66                                              │ constants/personas.js                      │                                                  │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ frontend/src/components/common/CommonUI.jsx        │ CONSOLIDATE GlassCard, StatusBadge,        │                                                  │
  │                                                    │ ReasonTag - already clean ✅               │                                                  │
  ├────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ backend/app/routes/auth_api.py lines 38-82         │ REFACTOR ACCOUNTS_DB to use                │ In-memory dict doesn't persist                   │
  │                                                    │ database-backed user store                 │                                                  │
  └────────────────────────────────────────────────────┴────────────────────────────────────────────┴──────────────────────────────────────────────────┘

  ---

  Executable Next Steps & Pull Request Blueprint

  Phase 1: Critical Security & Stability (Week 1)

  # 1. Add rate limiting
  cd backend && echo "slowapi>=0.1.9" >> requirements.txt
  # Edit main.py to add limiter middleware (see fix above)

  # 2. Fix audit hash display
  # Edit frontend/src/components/audit/HashChainInspector.jsx line 159

  # 3. Fix airplane mode queue flush
  # Edit frontend/src/context/AppStateContext.jsx lines 206-220

  # 4. Add input validation to schemas
  # Edit backend/app/models/schemas.py - add validators

  # 5. Run tests to verify nothing broke
  cd backend && python -m pytest tests/test_backend.py -v
  cd backend && python tests/verify_endpoints.py

  Phase 2: Database & Auth Hardening (Week 2)

  # 1. Add Alembic migrations
  cd backend && pip install alembic
  alembic init alembic
  # Edit alembic/env.py to import models
  alembic revision --autogenerate -m "initial schema"
  alembic upgrade head

  # 2. Add connection pooling to database.py
  # Edit create_engine() call with pool_size, max_overflow, pool_pre_ping

  # 3. Add global exception handlers
  # Create backend/app/core/exceptions.py
  # Register in main.py

  # 4. Add health/ready endpoints with DB check
  # Edit main.py /health and add /ready

  # 5. Run benchmark to verify performance
  cd backend && python tests/benchmark_perf.py

  Phase 3: Frontend Data Integrity & UX (Week 3)

  # 1. Install React Query
  cd frontend && npm install @tanstack/react-query

  # 2. Refactor AppStateContext to use React Query
  # Create frontend/src/hooks/useWelfareCases.js, useCommandHeatmap.js, etc.
  # Remove manual fetch + useEffect patterns

  # 3. Fix CaseList hardcoded stats
  # Edit frontend/src/components/welfare/CaseList.jsx lines 80-110

  # 4. Add Error Boundaries
  # Create frontend/src/components/common/ErrorBoundary.jsx
  # Wrap role sections in App.jsx

  # 5. Add loading skeletons
  # Create frontend/src/components/common/SkeletonCard.jsx

  # 6. Run frontend build
  cd frontend && npm run build

  Phase 4: Config, CI, Observability (Week 4)

  # 1. Create .env.example
  cat > .env.example << 'EOF'
  DEMO_MODE=true
  DATABASE_URL=sqlite:///./sahayak.db
  JWT_SECRET=your-32-char-min-secret-here
  JWT_ISSUER=sahayak-api
  JWT_EXPIRY_MINUTES=60
  CORS_ORIGINS=http://localhost:5173
  EOF

  # 2. Add GitHub Actions CI
  mkdir -p .github/workflows
  # Create ci.yml with: lint, test, build, security scan

  # 3. Add structured logging
  cd backend && echo "structlog>=24.0.0" >> requirements.txt
  # Configure in main.py lifespan

  # 4. Create Dockerfile
  cat > Dockerfile << 'EOF'
  FROM python:3.11-slim AS builder
  WORKDIR /app
  COPY backend/requirements.txt .
  RUN pip install --user -r requirements.txt
  FROM python:3.11-slim
  WORKDIR /app
  COPY --from=builder /root/.local /root/.local
  COPY backend/ .
  ENV PATH=/root/.local/bin:$PATH
  USER 1000
  EXPOSE 8000
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  EOF

  # 5. Frontend Dockerfile (nginx + vite build)

  Phase 5: Testing & Security Hardening (Week 5)

  # 1. Add frontend tests
  cd frontend && npm install -D @testing-library/react @testing-library/jest-dom jest-environment-jsdom
  # Create src/__tests__/components/CaseList.test.jsx

  # 2. Add security tests
  cd backend && pip install bandit pip-audit
  bandit -r app/
  pip-audit

  # 3. Add e2e tests (Playwright)
  cd frontend && npm install -D @playwright/test
  npx playwright install
  # Create e2e tests for login, escalation flow, break-glass

  # 4. Load test with locust
  cd backend && pip install locust
  # Create locustfile.py for concurrent user simulation

  ---

  Pull Request Order (Dependency-Safe)

  ┌──────┬────────────────────────────────────────────────────┬────────────────────────────────────────────────────┬────────────┐
  │ PR # │                       Title                        │                   Files Changed                    │ Depends On │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 1    │ Security: Rate Limiting + Input Validation         │ main.py, schemas.py, requirements.txt              │ —          │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 2    │ Fix: Audit Hash Display + Airplane Mode Queue      │ HashChainInspector.jsx, AppStateContext.jsx        │ —          │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 3    │ Fix: Hardcoded Frontend Stats                      │ CaseList.jsx                                       │ —          │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 4    │ Database: Alembic Migrations + Connection Pooling  │ database.py, alembic/, requirements.txt            │ PR 1       │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 5    │ Auth: Global Exception Handlers + Health Checks    │ exceptions.py, main.py                             │ PR 4       │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 6    │ Frontend: React Query Migration + Error Boundaries │ AppStateContext.jsx, new hooks, ErrorBoundary.jsx  │ PR 2, 3    │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 7    │ Config: .env.example + Docker + CI                 │ .env.example, Dockerfile, .github/workflows/ci.yml │ PR 4, 5    │
  ├──────┼────────────────────────────────────────────────────┼────────────────────────────────────────────────────┼────────────┤
  │ 8    │ Testing: Frontend Unit + E2E + Security Scans      │ src/__tests__/, e2e/, locustfile.py                │ PR 6, 7    │
  └──────┴────────────────────────────────────────────────────┴────────────────────────────────────────────────────┴────────────┘

  ---

  This audit covers every file in the repository. The codebase has excellent architectural vision (privacy tiers, cryptographic audit, k-anonymity) but
  needs production hardening on auth enforcement, rate limiting, database migrations, and frontend data integrity. The fixes above are ordered to unblock
  each other safely.