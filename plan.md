# Sahayak — Final Execution Plan

## Purpose

This is the execution plan for taking the current **Sahayak** SIH prototype from a working-but-credibility-limited prototype to a judge-defensible, technically honest, demo-ready system.

The plan is based on the strict repository audit. The audit currently places the project at approximately **62/100**, with the largest weaknesses being:

1. Universal frontend mock fallbacks that hide backend failures.
2. Committed secrets, credentials, databases, and exposed demo PINs.
3. Unevaluated and circular ML with overstated SHAP/INT8 claims.
4. No real HRMS ingestion path.
5. No real mobile/offline personnel experience.
6. No actual biometric/wearable integration.
7. Intervention outcomes are not tracked.
8. Commander metrics are partly arithmetic rather than measured aggregates.
9. No persistent offline outbox or persistent break-glass registry.
10. Missing deployment artifacts, migrations, CI, readiness checks, and meaningful tests.

The goal is **not** to add every possible feature. The goal is to make the existing product substantially more real, honest, secure, measurable, and defensible.

---

# 0. EXECUTION RULES

## 0.1 Do not invent functionality

Never claim a feature is implemented unless the repository actually contains the implementation and the implementation is exercised by the application.

Do not use fake data to make a real feature appear operational.

If a feature is simulated, label it explicitly as simulated/demo data.

Never describe:
- keyword rules as a trained AI model,
- self-reported sliders as biometrics,
- a browser page as a native mobile app,
- static recommendations as adaptive recommendations,
- synthetic evaluation as real-world validation,
- a toast/queue as real-time alerting,
- a stored officer label as active model retraining,
- or a future architecture as an implemented integration.

## 0.2 Preserve the strongest differentiators

Do not weaken or remove the following unless technically necessary:

- reason-code-only egress,
- dual-custody break-glass access,
- k-anonymity / small-cohort suppression,
- hash-chained audit ledger,
- welfare-not-disciplinary framing,
- unit-relative risk calibration.

These are central to Sahayak's differentiation.

## 0.3 Feature-freeze rule

After Phase 3, do not introduce new major features unless they satisfy at least one of:

1. Directly addresses an explicit PS requirement.
2. Fixes a judge-critical weakness.
3. Fixes a security/reliability problem.
4. Materially improves demo clarity/usability.

Do not add:
- chatbots,
- LLM assistants,
- unnecessary microservices,
- elaborate Kubernetes infrastructure,
- fancy AI models,
- wearable hardware integrations,
- or visual gimmicks

unless all higher-priority work is complete.

## 0.4 Working principle

Prefer:

**real + limited + honest**

over:

**broad + simulated + impressive-looking**

---

# 1. PHASE 0 — REPOSITORY BASELINE

## Goal

Create a safe baseline before changing application behavior.

## Tasks

### 1.1 Create a clean working branch

Create a dedicated implementation branch.

Record:
- current commit,
- current frontend build command,
- current backend start command,
- current test command,
- current environment variables,
- current database location,
- current demo credentials if they exist.

### 1.2 Inventory the repository

Identify:

- frontend entry points,
- backend entry points,
- API routes,
- database models,
- authentication,
- ML pipeline,
- seed/demo data,
- tests,
- deployment files,
- environment files,
- generated databases,
- documentation.

Do not modify behavior during this inventory.

### 1.3 Establish baseline commands

The agent must determine and document:

```text
frontend install
frontend dev
frontend build
backend install
backend run
backend tests
```

If a command currently fails, record the failure instead of silently working around it.

## Acceptance criteria

- Repository structure documented.
- Baseline build/run/test status recorded.
- No existing behavior silently removed.
- A rollback point exists.

---

# 2. PHASE 1 — TRUST, SECURITY, AND DEMO INTEGRITY

This phase has the highest priority.

---

## 2.1 REMOVE UNIVERSAL MOCK FALLBACKS

### Current problem

`frontend/src/services/api.js` catches backend failures and returns plausible fake data across login, cases, escalation, audit, heatmap, break-glass, interventions, and other APIs.

This makes the application appear functional even when the backend is unavailable.

### Required implementation

Replace universal fallback behavior with explicit modes.

Use an environment variable such as:

```text
VITE_DEMO_MODE=false
```

or an equivalent clearly named configuration.

Default must be:

```text
false
```

Normal application behavior:

```text
API request
   ↓
success → real response
failure → visible error/offline state
```

Demo mode behavior:

```text
explicit demo mode
   ↓
clearly marked simulated data
```

### Requirements

- Demo mode must never be silently activated.
- Normal mode must never silently fabricate API responses.
- API errors must propagate to the UI.
- Login must fail visibly if backend authentication fails.
- Escalation must fail visibly if backend is unavailable.
- Audit data must not silently become mock data.
- Case lists must not silently become hardcoded cases.

### UI requirement

Add a visible but professional offline/error state.

Example:

```text
Backend unavailable
Your action has not been submitted.
Please reconnect and retry.
```

For demo mode:

```text
DEMO DATA
Simulated environment for demonstration only
```

Do not hide this behind tiny footer text.

### Acceptance criteria

Disconnect the backend and verify:

- login fails,
- case fetch shows an error,
- escalation does not pretend to succeed,
- audit fetch does not return fake data,
- no fake CASE-LOCAL IDs appear,
- the user receives an understandable error.

---

## 2.2 REMOVE COMMITTED SECRETS AND CREDENTIAL EXPOSURE

### Current problem

The repository contains environment secrets, demo credentials, database files, and break-glass PIN exposure.

### Required actions

- Remove committed `.env` files containing real/shared secrets.
- Replace with safe `.env.example`.
- Rotate any credentials that were actually used outside the repository.
- Remove hardcoded demo password from the login UI.
- Remove hardcoded break-glass PINs from frontend/API responses.
- Remove demo PINs from authenticated API responses.
- Remove committed `.db` files if they contain sensitive/demo identity data.
- Ensure `.gitignore` correctly covers environment and database artifacts.

If repository history contains exposed secrets, document the need for history cleanup and credential rotation. Do not assume deleting the latest file is enough.

### Authentication

Do not auto-provision arbitrary IDs in a way that bypasses meaningful authentication.

For demo mode, use an explicit seeded demo identity mechanism rather than silently treating arbitrary prefixes as valid roles.

### Acceptance criteria

Repository scan shows no:
- passwords,
- private secrets,
- PINs,
- JWT secrets,
- committed sensitive databases.

Login screen has no prefilled password.

Break-glass screen never exposes custodian PINs.

---

## 2.3 HARDEN BREAK-GLASS ACCESS

### Goal

Make dual-custody access a real security feature rather than a demo-only illusion.

### Required behavior

Break-glass must require:

1. authorized requesting officer,
2. second authorized custodian,
3. distinct identities,
4. explicit reason,
5. auditable event,
6. time-bound access,
7. persistent registry/state.

Do not use an in-memory registry as the authoritative production state.

### Data minimization

Only reveal the minimum identity information necessary.

Do not return unnecessary:
- phone numbers,
- blood groups,
- exact base locations,
- unrelated personal information.

### Acceptance criteria

- Restart backend.
- Break-glass state remains valid where appropriate.
- Same person cannot satisfy both custody roles.
- Unauthorized role cannot trigger access.
- Every reveal creates an audit entry.
- No PIN is returned by an API.

---

## 2.4 FIX DATA ERASURE SEMANTICS

Implement a coherent data lifecycle.

Do not claim universal "DPDP compliance" unless legal/deployment requirements have actually been established.

Instead document:

- what is erased,
- what is retained,
- why audit records may be retained,
- who can request deletion,
- what the retention period is intended to be,
- what deployment authority must finalize.

Ensure a purge does not leave unexpected intervention/identity records that still expose the same person.

Do not ignore confirmation tokens.

### Acceptance criteria

A test case demonstrates:

```text
request purge
→ confirmation
→ authorized deletion
→ related records handled according to retention policy
→ audit record remains only where policy requires it
```

---

# 3. PHASE 2 — MAKE THE RISK ENGINE DEFENSIBLE

This phase is about technical honesty and measurable AI.

---

## 3.1 CORRECT THE AI NAMING

The current local personnel check is keyword matching + weighted scoring + EWMA.

Do not call it:

- INT8 AI,
- SHAP explainability,
- a neural model,
- or a sophisticated on-device NLP model.

Rename UI concepts to honest language:

```text
On-device wellness check
Why this case was flagged
Risk factors
Self-assessment
Recent trend
```

If the implementation is rules + statistical calibration, say so.

---

## 3.2 DEFINE THE MODEL ARCHITECTURE CLEARLY

The risk pipeline should be represented conceptually as:

```text
HR / wellness inputs
        ↓
validation
        ↓
feature preparation
        ↓
risk model
        ↓
calibration
        ↓
unit-relative risk band
        ↓
reason codes
        ↓
officer recommendation
```

Separate:

- prediction,
- calibration,
- reason-code generation,
- recommendation logic.

Do not make reason codes masquerade as model explanations.

---

## 3.3 FIX THE SYNTHETIC DATA PROBLEM

The current synthetic labels are generated from a formula derived from the same input features used by the model.

This creates circular evaluation.

### Required change

Redesign the synthetic dataset generation so the data-generating process is documented and less trivially identical to the final scoring function.

At minimum:

- document feature distributions,
- document context assumptions,
- document how latent risk is generated,
- avoid directly using the exact final model formula to create labels,
- introduce realistic noise,
- preserve class imbalance where appropriate,
- avoid obvious leakage.

### Important

Synthetic metrics must be explicitly labeled:

```text
Evaluation on synthetic validation data
```

Never present them as clinical or real-world validation.

---

## 3.4 CREATE A REAL TRAIN / VALIDATION / TEST PIPELINE

Implement deterministic:

```text
train
validation
test
```

or a defensible cross-validation strategy.

Do not tune thresholds on the final test set.

Record:

- seed,
- dataset size,
- class distribution,
- feature list,
- preprocessing,
- model parameters,
- threshold selection method,
- calibration method.

---

## 3.5 REPORT THE METRICS THAT JUDGES WILL ASK FOR

Create an evaluation script that reports at minimum:

- precision,
- recall,
- F1,
- confusion matrix,
- false positives,
- false negatives,
- PR-AUC where appropriate,
- ROC-AUC where appropriate,
- calibration information,
- metrics at the actual operational thresholds.

Because this is a welfare system, explicitly discuss:

```text
False positive:
unnecessary welfare review / officer workload / possible stigma

False negative:
missed welfare concern / delayed support
```

Do not optimize for accuracy alone.

### Acceptance criteria

A judge can ask:

> "What is your precision and recall?"

and the application/repository can answer with reproducible numbers and the dataset scope.

---

## 3.6 CREATE A MODEL CARD

Add:

```text
docs/ModelCard.md
```

Include:

- intended use,
- non-intended use,
- feature list,
- data source,
- synthetic-data limitations,
- training procedure,
- validation procedure,
- metrics,
- threshold rationale,
- known failure modes,
- fairness limitations,
- privacy considerations,
- human oversight,
- retraining policy,
- current version.

The model card must explicitly say that current evaluation is not external real-world validation if real operational data is unavailable.

---

## 3.7 ADD RISK TRAJECTORY

The current system mostly presents a point estimate.

Add historical trend where data exists:

```text
previous risk
current risk
direction
duration
recent changes
```

Possible states:

```text
stable
rising
falling
insufficient history
```

Do not fabricate history for real users.

Demo data may contain a clearly marked historical timeline.

---

## 3.8 ADD CONFIDENCE / INSUFFICIENT-DATA STATE

Do not force a strong risk band when the input history is insufficient.

Possible output:

```text
Insufficient history
```

rather than:

```text
Low risk
```

when evidence is inadequate.

If confidence is implemented, clearly distinguish model confidence from certainty.

---

# 4. PHASE 3 — MAKE THE PS WORKFLOW REAL

This is the most important product phase.

---

# 4.1 HRMS CSV INGESTION

Do this before building a native mobile app.

The PS explicitly requires HR indicators and secure HRMS integration. A real CSV ingestion path gives the project a credible integration story without requiring access to a real government HRMS.

### Implement

Create a documented CSV import adapter.

Input should map to the existing nine risk features.

Example conceptual pipeline:

```text
HRMS export CSV
      ↓
schema validation
      ↓
normalization
      ↓
feature mapping
      ↓
risk calculation
      ↓
case creation/update
      ↓
audit event
```

### Requirements

- schema validation,
- required/optional columns,
- invalid-row report,
- duplicate handling,
- date validation,
- unit validation,
- import summary,
- audit event.

Example result:

```text
Imported: 1,240
Updated: 1,118
New: 96
Rejected: 26
```

### Important

Do not claim live HRMS integration.

Pitch it as:

> "Sahayak provides an HRMS-ready ingestion adapter using validated exports. The deployment adapter can be connected to the authority's actual HRMS."

### Acceptance criteria

A judge can provide the sample CSV and see:

```text
CSV
→ validation
→ ingestion
→ risk calculation
→ welfare queue
```

without manually editing the database.

---

# 4.2 PERSONNEL EXPERIENCE AS AN INSTALLABLE PWA

Do NOT spend the project timeline building a separate native Android/iOS application.

Convert the existing personnel frontend into an installable PWA.

### Required capabilities

- web app manifest,
- service worker,
- installable on Android/desktop,
- standalone mode,
- offline personnel check-in,
- IndexedDB-backed outbox,
- sync when connectivity returns,
- clear offline status.

The product language should be:

> "Installable, offline-capable personnel PWA"

not:

> "Native mobile app"

unless a real native application is actually built.

### Offline flow

```text
Personnel opens PWA
        ↓
offline
        ↓
fills self-assessment
        ↓
stored locally in IndexedDB
        ↓
"Saved locally"
        ↓
network returns
        ↓
secure sync
        ↓
server acknowledgement
        ↓
local record marked synced
```

### Security requirements

Do not store raw sensitive journal data indefinitely in local storage.

Implement a reasonable retention/cleanup policy.

Never silently discard unsynced records.

---

# 4.3 WELLNESS DATA VS BIOMETRICS

Do not call current sliders biometrics.

Current fields such as:

- mood,
- fatigue,
- sleep,
- stress,
- journal

should be explicitly labeled:

```text
Self-reported wellness indicators
```

### Future-ready provider abstraction

Create an internal interface such as:

```text
WellnessProvider
 ├── SelfReportedProvider
 └── WearableProvider (future / not enabled)
```

The schema may support future data such as:

```text
source
timestamp
sleep_duration
resting_hr
hrv
activity_level
device_confidence
consent
```

But DO NOT generate fake wearable values.

### Current implementation

Implement only:

```text
SelfReportedProvider
```

and document the wearable adapter as future integration.

If a real supported device/API can be connected without destabilizing the project, it can be considered later. It is not a prerequisite for the main demo.

---

# 4.4 INTERVENTION OUTCOME LOOP

This is a major missing piece.

Current flow:

```text
risk
→ intervention
→ log
```

Required flow:

```text
risk
→ triage
→ intervention
→ follow-up
→ outcome
→ updated status
```

### Case states

Implement a clear state machine:

```text
OPEN
IN_REVIEW
INTERVENTION_ACTIVE
FOLLOW_UP_DUE
CLOSED
```

Optional:

```text
ESCALATED
DECLINED
```

### Intervention record

Capture:

- intervention type,
- timestamp,
- responsible role,
- target concern,
- follow-up date,
- outcome,
- optional outcome score,
- officer notes with appropriate sanitization.

### Outcome examples

Keep the system welfare-focused:

```text
Improved
Stable
Needs follow-up
Escalated
Unable to assess
```

Do not imply that an officer label automatically becomes ground truth for model retraining.

---

# 4.5 OFFICER LABELS

If officer labels are not used for retraining yet, explicitly state:

```text
Captured for evaluation and future retraining.
Not currently used to update the production model.
```

If time permits after all higher-priority work, implement an offline retraining pipeline that:

1. validates labels,
2. versions the dataset,
3. trains a candidate model,
4. evaluates it against the current model,
5. requires explicit approval before promotion.

Do not automatically retrain production from a single officer click.

---

# 4.6 COMMANDER ANALYTICS

Replace arbitrary arithmetic metrics with documented aggregates.

Every displayed number must have a traceable source.

For example:

```text
Elevated-risk personnel
= count of eligible personnel in the selected period

Average fatigue
= mean of valid fatigue observations

Cases per unit
= eligible cases / eligible personnel
```

Do not use formulas such as:

```text
avg_fatigue = friction * 10
```

unless the metric is explicitly a synthetic demonstration and labeled as such.

### Small-cohort suppression

Keep the existing k-anonymity behavior.

For:

```text
n < threshold
```

show:

```text
Suppressed for privacy
```

Do not allow commander analytics to reveal individual risk through small groups or repeated filtering.

---

# 4.7 ONE REAL ALERT CHANNEL

Only implement this after the core workflow works.

Choose one:

- push notification,
- email,
- SMS,
- or a real event notification mechanism.

For SIH, the simplest credible option is generally a real email/push integration if the environment supports it.

The system should demonstrate:

```text
critical event
→ alert generated
→ recipient notified
→ alert status recorded
```

Do not call an in-app toast "automated alerting."

If a real external provider cannot be safely configured, keep the internal alert event system and label external delivery as deployment configuration.

---

# 5. PHASE 4 — RELIABILITY, DEPLOYMENT, AND SCALE

Do not begin this phase until Phases 1-3 are functional.

---

## 5.1 POSTGRESQL + MIGRATIONS

Move production configuration away from SQLite.

Implement:

- PostgreSQL configuration,
- Alembic migrations,
- migration baseline,
- indexes for common queries,
- safe startup behavior.

Do not rely on:

```text
create_all()
```

as the production schema-management strategy.

SQLite may remain available for local development.

---

## 5.2 PERSISTENT IDENTITY / BREAK-GLASS REGISTRY

Move important security state from process memory to the database.

At minimum:

- identity registry,
- break-glass requests,
- approvals,
- expiration,
- audit reference.

Restart the application and verify that state is preserved.

---

## 5.3 PERSISTENT OFFLINE OUTBOX

Frontend outbox must use IndexedDB or equivalent persistent browser storage.

Required properties:

- survives page refresh,
- survives browser restart where supported,
- retry with bounded backoff,
- idempotency key,
- server acknowledgement,
- duplicate protection,
- failure state,
- manual retry.

Do not use React state as the only offline queue.

---

## 5.4 DOCKER

Create:

```text
Dockerfile
docker-compose.yml
```

for local reproducible deployment.

Services should be kept simple.

Minimum expected architecture:

```text
Frontend
   ↓
Backend API
   ↓
PostgreSQL
```

Add other infrastructure only if required.

---

## 5.5 HEALTH AND READINESS

Implement:

```text
/health
/ready
```

Health should indicate process health.

Readiness should verify required dependencies such as database connectivity.

Do not make `/health` a static `200 OK` regardless of system state.

---

## 5.6 DEPENDENCY LOCKING

Pin production dependencies or introduce an appropriate lock mechanism.

Remove loose dependency declarations such as:

```text
package>=version
```

where reproducibility matters.

---

## 5.7 CI

Create a lightweight CI pipeline that runs:

```text
install
lint if configured
tests
frontend build
backend import/startup check
security checks where practical
```

Do not build an elaborate CI/CD platform.

---

# 6. PHASE 5 — TESTING AND HARDENING

---

## 6.1 BACKEND TESTS

Expand beyond pure unit tests.

Add tests for:

- login,
- JWT expiry,
- role authorization,
- invalid roles,
- case creation,
- case retrieval,
- intervention creation,
- outcome updates,
- HRMS import,
- duplicate import,
- CSV validation,
- break-glass dual custody,
- break-glass expiration,
- k-anonymity suppression,
- audit chain verification,
- purge behavior,
- invalid inputs,
- rate limiting where appropriate.

---

## 6.2 FRONTEND TESTS

Test critical states:

- API success,
- API failure,
- offline,
- demo mode,
- retry,
- unsynced outbox,
- sync success,
- sync failure,
- empty cases,
- insufficient data,
- suppressed commander data.

---

## 6.3 SECURITY TESTS

Explicitly test that:

- PINs are never returned,
- unauthorized roles cannot access protected routes,
- one user cannot satisfy both break-glass custodians,
- small cohorts remain suppressed,
- sensitive data is not exposed through logs,
- invalid case IDs do not fall back to the first record,
- confirmation tokens are validated,
- audit mutations are demo-gated or protected.

---

## 6.4 FAILURE TESTING

Manually demonstrate:

```text
backend down
database unavailable
network disconnected
invalid HRMS row
duplicate HRMS import
expired token
unauthorized role
small cohort
tampered audit record
```

The system must fail safely and visibly.

---

# 7. PHASE 6 — UI / UX REFINEMENT

Only polish after correctness is established.

---

## 7.1 PERSONA-BASED NAVIGATION

Organize around:

```text
Personnel
Welfare Officer
Commander
Auditor
```

Avoid making users role-play by constantly switching portals.

---

## 7.2 REMOVE TECHNICAL JARGON

Do not expose judge-facing/user-facing terms such as:

- Z0,
- Z1,
- EWMA,
- weak-label,
- raw score,
- UUID,
- hash-chain internals

unless shown in an appropriate technical/auditor view.

Use:

```text
Emerging
Elevated
Critical
```

and:

```text
Why this was flagged
```

---

## 7.3 PERSONNEL UX

The personnel experience should feel private and non-disciplinary.

Prioritize:

- simple language,
- low cognitive load,
- Hindi/vernacular-ready text architecture,
- clear consent,
- no intimidating risk score,
- clear statement that the system supports welfare.

Do not display a frightening "mental health score" directly to personnel unless there is a compelling welfare reason.

---

## 7.4 WELFARE OFFICER UX

Prioritize:

```text
What needs attention?
Why?
What can I do?
What happened after intervention?
```

The queue should emphasize action rather than analytics theater.

---

## 7.5 COMMANDER UX

Commanders should see:

- aggregated trends,
- workload/welfare patterns,
- small-cohort suppression,
- recommended organizational actions,
- no unnecessary individual psychological detail.

---

## 7.6 AUDITOR UX

Auditor view should demonstrate:

- event timeline,
- actor role,
- event type,
- integrity verification,
- break-glass history,
- privacy events.

The audit view should be useful, not merely a wall of hashes.

---

# 8. PHASE 7 — DOCUMENTATION AND JUDGE DEFENSE

---

## 8.1 UPDATE PROJECT DOCUMENTATION

Remove all claims that are not implemented.

Specifically do not claim:

- production Postgres if not configured,
- Vault if not integrated,
- autoscaling if not deployed,
- TLS if only assumed,
- SHAP if not implemented,
- INT8 if not implemented,
- native mobile if only PWA,
- wearable biometrics if not integrated,
- real HRMS integration if only CSV adapter,
- real-time push if only internal alerts,
- active model retraining if labels are only stored.

---

## 8.2 CREATE ARCHITECTURE DOCUMENT

Create:

```text
docs/Architecture.md
```

Include:

```text
Personnel PWA
      ↓
API Gateway / FastAPI
      ↓
Auth + RBAC
      ↓
Risk Engine
      ↓
Case / Intervention Service
      ↓
PostgreSQL

Cross-cutting:
Audit
Privacy
K-anonymity
Alerting
```

Keep the architecture accurate to the implementation.

---

## 8.3 CREATE PRIVACY / THREAT MODEL DOCUMENT

Create:

```text
docs/ThreatModel.md
```

Cover:

- unauthorized officer access,
- insider misuse,
- re-identification,
- small cohort inference,
- compromised credentials,
- leaked device,
- offline device data,
- audit tampering,
- API abuse,
- data retention.

For each:

```text
Threat
Impact
Mitigation
Residual risk
```

---

## 8.4 CREATE LIMITATIONS DOCUMENT

Create:

```text
docs/Limitations.md
```

Be explicit about:

- synthetic training/evaluation data,
- no clinical diagnosis,
- no real wearable integration,
- HRMS adapter rather than live government HRMS,
- PWA rather than native application,
- need for deployment authority approval,
- need for real-world validation,
- need for security assessment before operational deployment.

This increases credibility rather than reducing it.

---

# 9. REQUIRED DEMO DATASET

Create a deterministic, clearly labeled demo dataset.

It should contain enough history to demonstrate:

- emerging risk,
- rising risk,
- stable low risk,
- critical risk,
- post-intervention improvement,
- persistent concern,
- insufficient history,
- small cohort suppression.

Do not seed only four static cases.

Demo data should be resettable through a documented seed command.

Example:

```text
seed-demo
reset-demo
```

Demo data must never be mixed with production data.

---

# 10. FINAL DEMO FLOW

Target a 4-5 minute demonstration.

## 0:00-0:40 — Problem

Show:

```text
Personnel
→ prolonged deployment / workload / separation
→ fragmented welfare signals
→ delayed intervention
```

Then state:

> Sahayak turns fragmented welfare indicators into privacy-preserving, actionable early-warning signals.

---

## 0:40-1:30 — Personnel PWA

Show:

- installable personnel experience,
- self-assessment,
- offline state,
- local save,
- sync after reconnect.

Do not call the fields biometrics.

Say:

> Current prototype uses voluntary self-reported wellness indicators. The data model is designed for future consented device/wellness integrations.

---

## 1:30-2:20 — Risk + Welfare Officer

Show:

```text
HRMS import
→ risk assessment
→ reason codes
→ welfare queue
→ case
```

Show actual reasons.

Avoid saying "AI magically detected depression."

Use:

> The system identifies elevated welfare concern from configured HR and wellness indicators and presents explainable reason codes for human review.

---

## 2:20-3:00 — Intervention Loop

Show:

```text
case
→ intervention
→ follow-up
→ outcome
```

This answers:

> "How do you know whether the intervention helped?"

---

## 3:00-3:40 — Privacy

Show:

- commander aggregate,
- small cohort suppression,
- break-glass dual custody,
- audit event.

Key message:

> Commanders receive organizational signals without automatically receiving individual psychological detail.

---

## 3:40-4:20 — Audit Integrity

Show:

```text
audit valid
→ tamper event
→ verification fails
→ restore
→ verification succeeds
```

This is one of the strongest existing demonstration elements.

---

## 4:20-5:00 — Scale / Deployment

Show:

```text
PWA
→ API
→ PostgreSQL
→ risk engine
→ audit
```

Mention:

- validated HRMS export adapter,
- persistent offline outbox,
- migrations,
- Docker,
- readiness checks,
- CI.

Do not claim national-scale production deployment.

Say:

> This is a deployable prototype architecture. Production rollout would additionally require authority-specific HRMS integration, security assessment, real-world model validation, operational policies, and infrastructure approval.

---

# 11. JUDGE QUESTIONS THE SYSTEM MUST ANSWER

Before submission, the team must be able to answer these without improvisation.

### Q1. What is your precision and recall?

Answer with actual evaluation results and dataset scope.

### Q2. What happens if the backend goes down?

Answer:

> The application shows an explicit offline/error state. It does not fabricate a successful submission.

### Q3. Where does HR data come from?

Answer:

> The prototype supports validated HRMS-style CSV ingestion mapped to the nine required indicators. A production deployment would connect the adapter to the authority's actual HRMS.

### Q4. Where is your mobile app?

Answer:

> Sahayak uses an installable offline-capable PWA for the prototype rather than a separate native application.

### Q5. Where are the biometrics?

Answer:

> The current implementation uses voluntary self-reported wellness indicators. We deliberately do not fabricate wearable measurements. The wellness provider abstraction is designed to accept future consented device data.

### Q6. Is this a diagnostic system?

Answer:

> No. It is a welfare-support and early-warning system. It does not diagnose a mental-health condition.

### Q7. Why not just use rules?

The answer must distinguish:

- model/calibration layer,
- reason-code layer,
- unit-relative normalization,
- operational thresholds.

Do not claim ML superiority without evidence.

### Q8. What happens after an officer labels false alarm?

Answer honestly:

> The label is captured for evaluation and future retraining. It does not silently modify the production model.

### Q9. Who can identify a person?

Explain:

- pseudonymous workflow,
- role restrictions,
- dual-custody break-glass,
- audit logging,
- minimum necessary disclosure.

### Q10. Why suppress small groups?

Explain re-identification risk.

### Q11. How do you know intervention worked?

Show:

```text
intervention
→ follow-up
→ outcome
```

### Q12. Can this scale to 50,000 personnel?

Explain the implemented architecture and distinguish prototype capability from operational deployment.

Do not say "yes" without qualification.

---

# 12. PRIORITY ORDER

If time becomes limited, execute in this exact order.

## P0 — Non-negotiable

1. Remove universal mock fallbacks.
2. Remove secrets, passwords, PIN exposure, committed DBs.
3. Fix break-glass persistence/security.
4. Correct AI naming.
5. Build reproducible model evaluation.
6. Create model card.
7. Fix documentation overclaims.

## P1 — High impact

8. HRMS CSV ingestion.
9. PWA + offline IndexedDB outbox.
10. Intervention follow-up/outcomes.
11. Defensible commander aggregates.
12. Persistent identity/break-glass state.

## P2 — Deployment credibility

13. PostgreSQL.
14. Alembic.
15. Docker.
16. `/health` + `/ready`.
17. Dependency locking.
18. CI.
19. Expanded tests.

## P3 — Polish

20. Risk trajectory.
21. Confidence / insufficient-data state.
22. One real alert channel.
23. UI terminology cleanup.
24. Hindi/vernacular UX refinement.
25. Demo dataset and final presentation polish.

---

# 13. DEFINITION OF DONE

Sahayak is ready for final SIH submission when all of the following are true:

## Product

- [ ] Personnel can use an installable PWA.
- [ ] Personnel can submit voluntary wellness information.
- [ ] Offline check-ins survive refresh and sync later.
- [ ] HRMS-style CSV data can be imported and validated.
- [ ] Risk assessment produces explainable reason codes.
- [ ] Welfare officers can review cases.
- [ ] Welfare officers can record interventions.
- [ ] Follow-up and outcome are recorded.
- [ ] Commander analytics use real aggregates.
- [ ] Small cohorts are suppressed.
- [ ] Break-glass requires dual custody.
- [ ] Audit events are persistent and verifiable.

## AI / ML

- [ ] Train/validation/test or equivalent defensible evaluation exists.
- [ ] Precision/recall/F1 are reported.
- [ ] FP/FN are reported.
- [ ] Operational thresholds are documented.
- [ ] Synthetic-data limitations are explicit.
- [ ] No fake SHAP/INT8 claims remain.
- [ ] Model card exists.
- [ ] Risk trajectory exists where history is available.
- [ ] Insufficient-data state exists.

## Security

- [ ] No secrets committed.
- [ ] No passwords embedded in frontend.
- [ ] No PINs returned by API.
- [ ] No sensitive DB artifacts committed.
- [ ] RBAC is tested.
- [ ] Break-glass is tested.
- [ ] Data purge semantics are documented and tested.
- [ ] Small-cohort privacy is tested.
- [ ] Sensitive logs are reviewed.

## Reliability

- [ ] Backend failures are visible.
- [ ] No universal fake fallback remains.
- [ ] Offline outbox is persistent.
- [ ] Duplicate submissions are handled.
- [ ] PostgreSQL configuration exists.
- [ ] Alembic migrations exist.
- [ ] Docker build works.
- [ ] `/health` and `/ready` work.
- [ ] CI passes.
- [ ] Tests cover critical workflows.

## Documentation

- [ ] Project documentation matches implementation.
- [ ] Architecture document exists.
- [ ] Model card exists.
- [ ] Threat model exists.
- [ ] Limitations document exists.
- [ ] Demo setup is reproducible.
- [ ] No unsupported claims remain.

---

# 14. AGENT EXECUTION INSTRUCTIONS

The AI coding agent must execute this plan incrementally.

For every phase:

1. Inspect the relevant existing implementation.
2. State exactly which files will change.
3. Implement the smallest coherent change.
4. Run relevant tests/builds.
5. Inspect the resulting behavior.
6. Update documentation.
7. Report completed tasks and remaining risks.
8. Do not move to the next phase if a critical acceptance criterion fails.

The agent must not rewrite the entire repository unless necessary.

Prefer surgical changes over wholesale rewrites.

When discovering an existing implementation that differs from this plan:

- preserve working functionality,
- reconcile with the plan,
- do not silently discard useful security/privacy mechanisms,
- update this plan or project documentation only when the implementation has a defensible reason to differ.

## Mandatory final audit

Before declaring completion, run a repository-wide audit for:

```text
TODO
FIXME
mock
fallback
demo password
PIN
secret
.env
.db
SHAP
INT8
biometric
HRMS
mobile
PWA
push
SMS
accuracy
precision
recall
production
DPDP
GDPR
```

Review every match for honesty and security.

Then run:

```text
frontend build
backend tests
integration tests
security tests
demo reset
demo startup
offline test
HRMS import test
audit tamper test
```

The final report must separate:

```text
IMPLEMENTED
PARTIALLY IMPLEMENTED
SIMULATED
FUTURE / NOT IMPLEMENTED
```

Never blur these categories.

---

# 15. FINAL PRODUCT POSITIONING

The final product should be positioned as:

> **Sahayak is a privacy-preserving welfare early-warning and intervention platform for deployed personnel. It combines HR indicators and voluntary wellness signals to identify elevated welfare concerns, gives authorized welfare officers explainable reasons and intervention workflows, protects individual privacy through role-based access, dual-custody break-glass and small-cohort suppression, and records actions through a tamper-evident audit trail.**

The central story is:

```text
Fragmented signals
        ↓
Privacy-preserving risk assessment
        ↓
Human welfare review
        ↓
Intervention
        ↓
Follow-up
        ↓
Measured outcome
        ↓
Auditable organizational insight
```

The product is **not**:

```text
AI surveillance
```

and it is **not**:

```text
automated mental-health diagnosis
```

The system should consistently communicate:

> **Support, not surveillance.**
