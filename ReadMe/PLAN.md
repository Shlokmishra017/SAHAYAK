 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Sahayak Production Refactoring Plan

 Context

 This plan addresses the architectural audit report findings to make the Sahayak Personnel Welfare Intelligence Platform production-ready. The changes span
 security hardening, database persistence, frontend resilience, and validation.

 ---

 Phase 1: Security & Route Hardening (FastAPI Backend)

 1.1 Add SlowAPI Rate Limiter

 Files to modify:
 - backend/requirements.txt - Add slowapi>=0.1.9
 - backend/app/main.py - Configure limiter with get_remote_address, register middleware and exception handler
 - backend/app/routes/auth_api.py - Add request: Request parameter to login endpoint and decorate with @limiter.limit("10/minute")
 - backend/app/routes/device_api.py - Add request: Request parameter to escalations endpoint and decorate with @limiter.limit("30/minute")

 1.2 Authentication Gatekeeping

 Files to modify:
 - backend/app/main.py - Add dependencies=[Depends(get_current_user)] to all app.include_router() calls except auth_router
 - Add public endpoint exclusions for /health, /ready, /docs, /openapi.json, /
 - backend/app/core/security.py - Extract _AUTHORIZED_CUSTODIANS to environment variables with validation

 1.3 Data Bounds & Seeding Safety

 Files to modify:
 - backend/app/main.py - Replace lines 41-45 with bounds-safe slice logic checking if len(high_stress) == 0 and safely capping bounds before head(min(4,
   len(high_stress)))
 - Wrap mock seeding in if settings.demo_mode: check

 ---

 Phase 2: Database Layer & State Persistence

 2.1 Dialect-Aware Engine Pooling

 Files to modify:
 - backend/app/core/database.py - Add conditional pool configuration:
   - PostgreSQL: pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=1800
   - SQLite: Keep connect_args={"check_same_thread": False} only

 2.2 Schema & Model Indexes

 Files to modify:
 - backend/app/models/schemas.py or new backend/app/models/__init__.py:
   - Add index on CaseRecord.closed_at
   - Add composite index ix_cases_tier_status on ('tier', 'status')
   - Add index ix_audit_prev_hash on AuditBlockRecord.prev_hash
   - Add created_at index on IdempotencyRecord

 2.3 Identity Registry Persistence

 Files to modify:
 - backend/app/core/database.py - Add IdentityRegistry model table
 - backend/app/core/security.py - Refactor IdentityBroker._REGISTRY to read/write from database

 ---

 Phase 3: Frontend Resilience & Offline Synchronization

 3.1 Airplane Mode Queue Flusher

 Files to modify:
 - frontend/src/context/AppStateContext.jsx - Rewrite offline sync effect (lines 206-220):
   - Use sequential for...of with await submitEscalation(payload)
   - Track failed payloads in array
   - Atomic setEscalationOutbox(prev => prev.filter(item => !failedIds.has(item.id)))
   - Add toast feedback for dispatched vs failed records

 3.2 Audit Hash Integrity Display

 Files to modify:
 - frontend/src/components/audit/HashChainInspector.jsx - Line 159:
   - Display formatted: ${hash.slice(0, 8)}...${hash.slice(-8)}
   - Add copy-to-clipboard action
   - Add tooltip showing full 64-character SHA-256

 3.3 Decouple Dynamic Data & Hardcoded Mocks

 Files to modify:
 - frontend/src/components/welfare/CaseList.jsx:
   - Remove hardcoded 144, 92.4%, 2 - bind to cohortStats with fallbacks
   - Remove mock fallback arrays from fetchWelfareCases catch blocks
 - frontend/src/services/api.js:
   - Add interceptor to clear sahayak_access_token on HTTP 401
   - Remove lines 92-222 (dead fallback mocks)

 3.4 React Query & Error Boundary

 Files to modify:
 - frontend/package.json - Add @tanstack/react-query
 - frontend/src/main.jsx - Wrap root in <QueryClientProvider>
 - Create frontend/src/components/common/ErrorBoundary.jsx
 - Wrap dashboard views in ErrorBoundary

 ---

 Phase 4: Verification & Validation

 4.1 Backend Tests

 cd backend && pytest -v --tb=short

 4.2 Frontend Build & Type Check

 cd frontend && npm run build

 4.3 Integration Test

 - Start backend: uvicorn app.main:app --reload
 - Start frontend: npm run dev
 - Test all authentication flows, rate limits, offline sync, audit verification

 ---

 Implementation Order

 1. Backend Security (Phase 1) - Critical for production
 2. Database Persistence (Phase 2) - Required for data integrity
 3. Frontend Resilience (Phase 3) - Improves UX and reliability
 4. Validation (Phase 4) - Ensures everything works

 ---

 Key Files to Modify (Summary)

 ┌───────┬──────────────────────────────────────────────────────┬───────────────────────────────────────────────┐
 │ Phase │                         File                         │                    Purpose                    │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 1     │ backend/requirements.txt                             │ Add slowapi                                   │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 1     │ backend/app/main.py                                  │ Rate limiting, auth gatekeeping, safe seeding │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 1     │ backend/app/routes/auth_api.py                       │ Rate limit login                              │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 1     │ backend/app/routes/device_api.py                     │ Rate limit escalations                        │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 1     │ backend/app/core/security.py                         │ Env-based custodian credentials               │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 2     │ backend/app/core/database.py                         │ Pool config, IdentityRegistry model           │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 2     │ backend/app/core/security.py                         │ Persist registry to DB                        │
 ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ 2     │ backend/app/core/security.py                         │ Persist registry to DB                        │
Mapped message: Invalid request sent to provider.

Upstream error:
{"message":"qwen/qwen-2.5-coder-7b-instruct is not a valid model ID","code":400}

Request ID: req_fa59689f9aae4131bde524c9a021b587

  Thought for 18s (ctrl+o to expand)

● Explore(Explore frontend structure)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

● Agent "Explore frontend structure" failed: Agent terminated early due to an API error: API Error: 400 Upstream provider OPENROUTER returned HTTP 400.
Category: invalid_request
Mapped message: Invalid request sent to provider.

Upstream error:
{"message":"qwen/qwen-2.5-coder-7b-instruct is not a valid model ID","code":400}

Request ID: req_a599cbc1882243b590aacbfa7d172d72

  Thought for 3m 29s, searched for 3 patterns, read 18 files (ctrl+o to expand)

● Agent "Explore frontend structure" failed: Agent terminated early due to an API error: API Error: 400 Upstream provider OPENROUTER returned HTTP 400.
Category: invalid_request
Mapped message: Invalid request sent to provider.

Upstream error:
{"message":"qwen/qwen-2.5-coder-7b-instruct is not a valid model ID","code":400}

Request ID: req_d5f6df3d0a3c48d59a1f2d8c5b97b546

● Now I have a thorough understanding of the codebase. Let me create the implementation plan.

● Updated plan
  ⎿  /plan to preview

  Thought for 5s (ctrl+o to expand)

● User approved Claude's plan
  ⎿  Plan saved to: C:\Users\mshlo\.claude\plans\binary-soaring-spindle.md · /plan to edit
     Sahayak Production Refactoring Plan

     Context

     This plan addresses the architectural audit report findings to make the Sahayak Personnel Welfare Intelligence Platform production-ready. The changes
     span security hardening, database persistence, frontend resilience, and validation.

     ---

     Phase 1: Security & Route Hardening (FastAPI Backend)

     1.1 Add SlowAPI Rate Limiter

     Files to modify:
     - backend/requirements.txt - Add slowapi>=0.1.9
     - backend/app/main.py - Configure limiter with get_remote_address, register middleware and exception handler
     - backend/app/routes/auth_api.py - Add request: Request parameter to login endpoint and decorate with @limiter.limit("10/minute")
     - backend/app/routes/device_api.py - Add request: Request parameter to escalations endpoint and decorate with @limiter.limit("30/minute")

     1.2 Authentication Gatekeeping

     Files to modify:
     - backend/app/main.py - Add dependencies=[Depends(get_current_user)] to all app.include_router() calls except auth_router
     - Add public endpoint exclusions for /health, /ready, /docs, /openapi.json, /
     - backend/app/core/security.py - Extract _AUTHORIZED_CUSTODIANS to environment variables with validation

     1.3 Data Bounds & Seeding Safety

     Files to modify:
     - backend/app/main.py - Replace lines 41-45 with bounds-safe slice logic checking if len(high_stress) == 0 and safely capping bounds before head(min(4,
       len(high_stress)))
     - Wrap mock seeding in if settings.demo_mode: check

     ---

     Phase 2: Database Layer & State Persistence

     2.1 Dialect-Aware Engine Pooling

     Files to modify:
     - backend/app/core/database.py - Add conditional pool configuration:
       - PostgreSQL: pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=1800
       - SQLite: Keep connect_args={"check_same_thread": False} only

     2.2 Schema & Model Indexes

     Files to modify:
     - backend/app/models/schemas.py or new backend/app/models/__init__.py:
       - Add index on CaseRecord.closed_at
       - Add composite index ix_cases_tier_status on ('tier', 'status')
       - Add index ix_audit_prev_hash on AuditBlockRecord.prev_hash
       - Add created_at index on IdempotencyRecord

     2.3 Identity Registry Persistence

     Files to modify:
     - backend/app/core/database.py - Add IdentityRegistry model table
     - backend/app/core/security.py - Refactor IdentityBroker._REGISTRY to read/write from database

     ---

     Phase 3: Frontend Resilience & Offline Synchronization

     3.1 Airplane Mode Queue Flusher

     Files to modify:
     - frontend/src/context/AppStateContext.jsx - Rewrite offline sync effect (lines 206-220):
       - Use sequential for...of with await submitEscalation(payload)
       - Track failed payloads in array
       - Atomic setEscalationOutbox(prev => prev.filter(item => !failedIds.has(item.id)))
       - Add toast feedback for dispatched vs failed records

     3.2 Audit Hash Integrity Display

     Files to modify:
     - frontend/src/components/audit/HashChainInspector.jsx - Line 159:
       - Display formatted: ${hash.slice(0, 8)}...${hash.slice(-8)}
       - Add copy-to-clipboard action
       - Add tooltip showing full 64-character SHA-256

     3.3 Decouple Dynamic Data & Hardcoded Mocks

     Files to modify:
     - frontend/src/components/welfare/CaseList.jsx:
       - Remove hardcoded 144, 92.4%, 2 - bind to cohortStats with fallbacks
       - Remove mock fallback arrays from fetchWelfareCases catch blocks
     - frontend/src/services/api.js:
       - Add interceptor to clear sahayak_access_token on HTTP 401
       - Remove lines 92-222 (dead fallback mocks)

     3.4 React Query & Error Boundary

     Files to modify:
     - frontend/package.json - Add @tanstack/react-query
     - frontend/src/main.jsx - Wrap root in <QueryClientProvider>
     - Create frontend/src/components/common/ErrorBoundary.jsx
     - Wrap dashboard views in ErrorBoundary

     ---

     Phase 4: Verification & Validation

     4.1 Backend Tests

     cd backend && pytest -v --tb=short

     4.2 Frontend Build & Type Check

     cd frontend && npm run build

     4.3 Integration Test

     - Start backend: uvicorn app.main:app --reload
     - Start frontend: npm run dev
     - Test all authentication flows, rate limits, offline sync, audit verification

     ---

     Implementation Order

     1. Backend Security (Phase 1) - Critical for production
     2. Database Persistence (Phase 2) - Required for data integrity
     3. Frontend Resilience (Phase 3) - Improves UX and reliability
     4. Validation (Phase 4) - Ensures everything works

     ---

     Key Files to Modify (Summary)

     ┌───────┬──────────────────────────────────────────────────────┬───────────────────────────────────────────────┐
     │ Phase │                         File                         │                    Purpose                    │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 1     │ backend/requirements.txt                             │ Add slowapi                                   │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 1     │ backend/app/main.py                                  │ Rate limiting, auth gatekeeping, safe seeding │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 1     │ backend/app/routes/auth_api.py                       │ Rate limit login                              │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 1     │ backend/app/routes/device_api.py                     │ Rate limit escalations                        │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 1     │ backend/app/core/security.py                         │ Env-based custodian credentials               │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 2     │ backend/app/core/database.py                         │ Pool config, IdentityRegistry model           │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 2     │ backend/app/core/security.py                         │ Persist registry to DB                        │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/context/AppStateContext.jsx             │ Offline queue flusher                         │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/components/audit/HashChainInspector.jsx │ Hash display                                  │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/components/welfare/CaseList.jsx         │ Remove hardcoded mocks                        │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/services/api.js                         │ 401 interceptor, remove mocks                 │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/package.json                                │ Add React Query                               │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/main.jsx                                │ QueryClientProvider                           │
     ├───────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
     │ 3     │ frontend/src/components/common/ErrorBoundary.jsx     │ New component                                 │
     └───────┴──────────────────────────────────────────────────────┴───────────────────────────────────────────────┘

     ---

     Verification Checklist

     - [ ] Rate limiting works on /v1/auth/login (10/min) and /v1/device/escalations (30/min)
     - [ ] All protected routes require valid JWT
     - [ ] Public endpoints accessible without auth
     - [ ] Custodian credentials from environment variables
     - [ ] Database pooling works for PostgreSQL and SQLite
     - [ ] All indexes created in database
     - [ ] Identity registry survives process restart
     - [ ] Offline queue flushes sequentially with error tracking
     - [ ] Hash display shows formatted prefix with copy action
     - [ ] No hardcoded mock data in welfare case list
     - [ ] 401 clears token and redirects to login
     - [ ] React Query provider wraps app
     - [ ] Error boundaries catch component errors
     - [ ] All backend tests pass
     - [ ] Frontend builds without errors