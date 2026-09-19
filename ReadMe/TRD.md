# Sahayak AI Technical Requirements Document

## 1. Purpose

Sahayak AI is a privacy-preserving personnel welfare platform. It combines on-device wellness signals with server-side operational risk bands and exposes only the minimum information needed for welfare intervention, command-level aggregate planning, and audit review.

This document defines the production-readiness requirements identified in `REVIEW_FINDINGS.md`. It is the target contract for implementation and testing.

## 2. Goals

- Protect every API route with authenticated, role-based access.
- Preserve case, identity, and audit data across process restarts.
- Keep the audit ledger tamper-evident and append-only.
- Validate all external input at the API boundary.
- Prevent abuse through authentication and API rate limits.
- Deliver queued offline escalations exactly once from the client perspective.
- Replace misleading hardcoded operational statistics with authoritative data.
- Preserve zero-knowledge boundaries, reason-code allowlisting, and k-anonymity.

## 3. Non-goals

- Uploading raw journal text, audio, continuous wellness scores, or diagnoses.
- Giving commanders access to individual cases or individual risk scores.
- Replacing a real identity provider, hardware attestation service, or deployment secret manager in this phase.
- Building a general analytics warehouse.
- Removing legally required audit evidence without an approved retention policy.

## 4. Actors and permissions

| Role | Permitted capabilities |
| --- | --- |
| Device personnel | Device attestation, own risk-band retrieval, escalation, self-referral, own erasure request |
| Welfare officer | Case queue, case detail, intervention logging, case feedback |
| Commander | k-anonymous heatmaps, cohesion aggregates, cohort statistics |
| Auditor | Audit ledger inspection and integrity verification |
| System | Model bootstrap, controlled demo seeding, internal audit events |

Every protected request must derive the actor and role from a verified access token. Client-supplied `officer_id`, `commander_id`, or actor role must not override token claims.

## 5. Functional requirements

### FR-1 Authentication

- `POST /v1/auth/login` must verify an account and password through a replaceable identity-provider boundary.
- Successful login returns a signed JWT with subject, role, issuer, issued-at, and expiry claims.
- Invalid credentials return the same generic error regardless of whether the account exists.
- Secrets and signing keys come from environment configuration or a secret manager.
- Demo accounts and dynamic account provisioning are disabled unless an explicit demo-mode flag is enabled.

### FR-2 Authorization

- All `/v1/device/*`, `/v1/welfare/*`, `/v1/command/*`, `/v1/identity/*`, and `/v1/audit/*` endpoints require authentication.
- Route dependencies enforce the role matrix in section 4.
- Unauthorized requests return `401`; authenticated users without permission return `403`.
- Audit events record the verified actor identity hash and role.

### FR-3 Durable storage

The system must persist:

- Cases and interventions.
- Audit blocks.
- Cohort metadata and any registered identity records required by active workflows.
- Erasure state and retention metadata.

SQLite is acceptable for local/demo deployment. PostgreSQL is the target for multi-instance production deployment. Schema creation must be migration-based, not implicit runtime mutation.

### FR-4 Audit ledger

- Actor identifiers use the full lowercase SHA-256 digest.
- Blocks contain sequence, timestamp, actor hash, action, case/pseudonym references, metadata, previous hash, and block hash.
- Appends are serialized transactionally so two writers cannot create the same sequence or fork the chain.
- Startup integrity verification must fail closed or raise a visible operational alert when persisted blocks are invalid.
- Audit retention and erasure behavior must be documented and approved. Pseudonym references may be tombstoned where required without rewriting historical block hashes.

### FR-5 Input validation

All request bodies and query parameters must validate:

- UUID/pseudonym and case ID formats where applicable.
- Enumerated role, tier, origin, status, intervention, label, and support values.
- Required fields and maximum string/list lengths.
- ISO-8601 timestamps with a bounded past/future window.
- Allowed reason codes and a non-empty valid result after filtering.
- Foreign-key existence for case and pseudonym references where applicable.
- Erasure confirmation and authorization requirements.

Validation errors must return a stable public error shape without stack traces, filesystem paths, SQL details, or internal model information.

### FR-6 Error handling

- Install centralized handlers for validation, authentication, authorization, not-found, rate-limit, and unexpected errors.
- Log diagnostic details server-side with a correlation ID.
- Return safe messages to clients.
- Do not convert backend failures into successful-looking frontend responses in authenticated production mode.

### FR-7 Rate limiting

Rate limits must be enforced per IP and, after authentication, per subject/device where appropriate:

- Login: 5 attempts per minute.
- Device escalation: 10 accepted submissions per device per hour.
- Welfare and audit reads: 100 requests per minute per subject.
- Command aggregates: 50 requests per minute per subject.

Return HTTP 429 with `Retry-After`. Limits must be configurable.

### FR-8 Demo seeding

- Demo seeding runs only when `DEMO_MODE=true`.
- Seeding must be bounds-safe for zero, one, or fewer than four records.
- Seed records must be idempotent across restarts and must not duplicate persistent cases.
- Production startup must not generate synthetic personnel or seed cases.

### FR-9 Cohort statistics

- Cohort statistics must come from an authoritative backend source.
- The endpoint must expose only the minimum aggregate fields required by the welfare dashboard.
- It must not expose individual personnel or bypass applicable privacy thresholds.
- The displayed value must not silently fall back to a fabricated value when the backend is unavailable.

### FR-10 Offline escalation delivery

- Offline escalations are stored in durable client storage with a unique client event ID, payload, creation time, and retry metadata.
- On connectivity restoration, queued events are submitted one at a time or in a bounded batch.
- The server accepts an idempotency key and returns the original case result for a duplicate event.
- An event is removed only after a confirmed successful response.
- Transient failures remain queued with bounded exponential backoff.
- Permanent validation/authentication failures are marked failed and shown to the user.
- Queue recovery is safe across reloads and airplane-mode transitions.

### FR-11 Check-in metric semantics

- The frontend must define whether completion is per device, per assigned unit, or cohort-wide.
- A local-device metric must not be presented as organization-wide compliance.
- The measurement window and denominator must be explicit and consistent.

## 6. API requirements

### Authentication

`POST /v1/auth/login`

Request: credentials accepted by the configured identity provider.

Response: `{ access_token, token_type, expires_in, user }`.

### Cohort statistics

`GET /v1/command/cohort-statistics`

Requires an authorized role. Response contains aggregate personnel count and permitted unit metadata. The response must be generated from persistent or initialized authoritative data.

### Escalation idempotency

`POST /v1/device/escalations`

Requires `Idempotency-Key` header or an equivalent validated client event ID. Duplicate submissions return the original accepted case ID and do not create a second case or audit event.

## 7. Data model requirements

Minimum entities:

- `Account`: subject, role, credential-provider reference, status, timestamps.
- `Case`: case ID, pseudonym, tier, origin, reason codes, status, timestamps, unit context, idempotency key.
- `Intervention`: case reference, type, sanitized notes, actor subject, timestamp.
- `AuditBlock`: chain fields and immutable metadata.
- `Cohort`: aggregate/unit metadata and source version.
- `OutboxEvent` or equivalent client-side record: event ID, payload, state, retries, next attempt.

Foreign keys, unique constraints, indexes on case ID, pseudonym, status, and idempotency key are required.

## 8. Privacy and security invariants

- Raw journal content and audio never leave the device.
- Server accepts closed-vocabulary reason codes only.
- Command responses enforce k-anonymity with complementary suppression.
- Welfare responses contain flagged cases only.
- Identity disclosure requires the existing dual-custodian break-glass workflow.
- Secrets, passwords, and tokens are never logged.
- CORS is restricted to configured frontend origins in non-demo environments.

## 9. Observability and operations

- Every request receives a correlation ID.
- Authentication failures, authorization denials, rate-limit events, persistence failures, and audit-integrity failures are observable.
- Health checks distinguish process health from database readiness.
- Metrics include request errors, queue depth, queue retries, duplicate idempotency events, and audit append failures.

## 10. Acceptance criteria

The implementation is acceptable when:

1. An unauthenticated request cannot read or mutate protected resources.
2. A valid user cannot access another role's routes.
3. Cases and audit blocks survive a backend restart.
4. Concurrent audit appends preserve sequence and chain integrity.
5. Invalid timestamps, IDs, enum values, oversized fields, and unknown references are rejected safely.
6. Repeated login, escalation, and query requests trigger configured 429 responses.
7. Demo seeding is disabled in production and safe for small cohorts.
8. Offline events survive reload, retry after transient failure, and do not duplicate cases.
9. Failed queue events are not discarded.
10. Dashboard statistics are backend-derived or clearly unavailable; fabricated fallback values are not shown as real.
11. Existing privacy, k-anonymity, break-glass, and reason-code tests continue to pass.

## 11. Constraints and assumptions

- The first deployment may use SQLite, but repository interfaces must avoid coupling route code to SQLite-specific behavior.
- A real identity provider can replace the demo account directory without changing route authorization contracts.
- Existing frontend mock data may remain available for explicitly labeled offline/demo mode only.
