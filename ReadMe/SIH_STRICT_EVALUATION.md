# SIH STRICT EVALUATION — SAHAYAK (as it exists TODAY)

> Method: static repository inspection only (plan-mode, read-only). No code was executed. `CODE EXISTS` vs `WORKS` vs `CONVINCINGLY DEMONSTRATED` is distinguished below. Where runtime behavior could not be verified, it is marked as **UNVERIFIED**.

---

## PHASE 1: UNDERSTAND THE PROBLEM (from `ReadMe/PS.md`)

### 1. Exact problem
CAPF / Armed Forces personnel under prolonged deployment, family separation, irregular hours, trauma → deteriorating mental well-being. Current detection = manual observation + self-reporting → delayed intervention. Need proactive, technology-driven early identification of stress / burnout / emotional fatigue / welfare concern.

### 2. Target users / stakeholders
Personnel (jawans/constables, monitored population) → Welfare Officers (triage) → Commanders (readiness/planning) → implied Medical Officers, DPO/Auditors, HRMS admins. Affected population: BSF, CRPF, ITBP, CISF, SSB, RAF + Armed Forces.

### 3. Pain point
Late, manual, stigmatized, unscalable detection. No early-warning, no workload-balancing signal, no privacy-trusted channel.

### 4. Required functionality (explicit)
1. Analyze HR indicators: leave, deployment, duty, transfers, training, workload.
2. Optional self-report + wellness assessment via secure **mobile** app.
3. Voluntary biometric / wellness data where permissible.
4. Detect behavioral patterns for elevated risk.
5. Risk assessments + welfare recommendations for authorized officers/commanders.
6. Enable counseling, interventions, workload balancing.

### 5. Expected outcomes (explicit `Expected Solution` = 8 items)
Dashboard + Mobile self-assessment app + Predictive behavioral engine + Stress/burnout models + Intervention recommendation system + RBAC + privacy framework + Automated alerts + Anonymization + secure storage.

Benefits: early ID, fewer stress incidents, resilience, readiness, better workload distribution, retention, data-driven welfare planning.

### 6-7. Constraints / technical requirements
Privacy/confidentiality, no stigmatization, minimize FP/FN, ethical/transparent AI, cyber-secure sensitive psych data, build trust, welfare-not-disciplinary, dignity + DPDP-style protection, secure HRMS integration.

### 8. Implicit requirements a strong solution needs
Real HRMS connector (not simulated), measurable model performance (precision/recall, FP/FN tradeoff), explainability an officer trusts, closed-loop outcome tracking (did intervention help?), real alerting (push/SMS, not just a queue row), offline/low-connectivity handling for field posts, Hindi/vernacular + low-literacy UX, role workflows that survive 10x/100x scale, auditability without re-identification risk.

### 9. What differentiates from basic implementation
Not just CRUD + chart dashboard. Differentiation = validated risk signal on real-ish HR features + unit-relative calibration + privacy that actually constrains data flow + dual-custody de-anonymization + k-anonymity that actually suppresses + officer-actionable recommendations + measured FP/FN + HRMS-ready integration story.

### PS coverage verdict

| PS demand | Status | Evidence |
|---|---|---|
| HR indicators | **Partially satisfied** — 9 real features used, but only synthetic | `backend/app/ml/hr_risk_model.py:10-20`, `synthetic_generator.py:67-90` — no HRMS connector anywhere in repo |
| Self-report mobile app | **Partially** — browser simulation only | `frontend/src/components/personnel/PersonnelView.jsx:1-100`, check-in logic in `AppStateContext.jsx:220-248` — no native/mobile build |
| Biometric / wellness | **Weakly demonstrated** — sliders only | mood/sleep/fatigue numbers in `PersonnelView.jsx:27-30`, `localModel.js:104-109` — no wearable/sensor API |
| Behavioral patterns | **Partially** — EWMA + thresholds, not forecasting | `localModel.js:90-136` EWMA, `hr_risk_model.py:81-99` `if days>60` rules — no time-series forecast |
| Risk assessment + recommendations | **Partially** — tiers + static lookup | `reason_codes.py:14-95` 10 codes with `recommended_action` — static string per code |
| Counseling / workload balancing | **Partially** — log exists, loop not closed | `backend/app/routes/welfare_api.py:103-126` logs intervention — no follow-up, no outcome metric, no roster integration |
| Dashboard | **Fully (code exists)** | `CasesView.jsx`, `TeamPulseView.jsx`, `AuditLedgerView.jsx` |
| Predictive engine/models | **Weakly demonstrated** — real sklearn, circular training | See Phase 8 |
| RBAC + privacy | **Fully (strongest area)** | `auth.py:51-70`, `main.py:108-112`, `k_anonymity.py:7-36`, `audit_chain.py:79-170`, `security.py:63-108` |
| Automated alerts | **Weakly** — queue + toast only | Escalation creates `CaseRecord` (`device_api.py`) → queue; `showToast` in `AppStateContext.jsx:282-285` — no push/SMS/email/WebSocket |
| Anonymization + secure storage | **Partially** — pseudonym + k-anon real, storage not secure | Pseudonym UUID + `actor_id_hash` real; but SQLite default, committed `.db`, committed `.env`, no encryption-at-rest |

**No credit given** for `Project.md:232-255` claims of Postgres/strict CORS/JSON logging/autoscaling/Vault/TLS — none implemented.

---

## PHASE 2: ACTUALLY INSPECT THE PROJECT

### What was inspected (read-only)
Backend `main.py`, `core/*`, `ml/*`, `routes/*`, `models/schemas.py`; frontend `App.jsx`, `services/api.js` (619 lines, fully read), `services/localModel.js` (156 lines), `context/AppStateContext.jsx` (324 lines), `LoginPortal.jsx`, `CasesView.jsx`, `PersonnelView.jsx`; `requirements.txt`, `tests/*`, `.env`, `.gitignore`, `run.py`, `start.bat`.

### CODE EXISTS vs ACTUALLY WORKS vs CONVINCINGLY DEMONSTRATED

| Feature | Code exists? | Likely works? | Convincingly demonstrated? |
|---|---|---|---|
| JWT login + per-router RBAC | Yes — `auth.py:19-70`, `main.py:108-112` | Likely (UNVERIFIED runtime) | Yes — login portal + role redirect `App.jsx:34-41`, `LoginPortal.jsx:35-47` |
| Device escalation → case | Yes — `device_api.py` | Likely, thresholds hardcoded `tau 0.45/0.65/0.85`, `h_band=3/1` hardcoded | Yes — `triggerDeviceEscalation` in `AppStateContext.jsx:250-280` |
| Welfare queue + detail + intervention + label | Yes — `welfare_api.py:26-153` | Likely | Yes — `CasesView.jsx`, `CaseDetailView.jsx`, `InterventionModal.jsx` |
| Commander heatmap + k-anon suppression | Yes — `command_api.py:15-62`, `k_anonymity.py` | Likely, but counts are arithmetic (`avg_fatigue=friction*10`) not measured | Yes — suppressed outpost row exists |
| Audit chain + verify + tamper demo | Yes — `audit_chain.py:118-260` | Likely (persist=True) | Yes — strongest demo prop |
| Break-glass dual-custody | Yes — `security.py:63-108`, `identity_api.py:14-32` | Likely in demo; **prod breaks** (in-memory `_REGISTRY:35` lost on restart; `custodians-info` hardcoded IDs/PINs) | Yes — `BreakGlassModal.jsx` |
| On-device NLP / INT8 / SHAP | **No — mislabeled.** `localModel.js:3-88` is multilingual keyword `includes()` + scores `-3.0/-0.8/-0.5/+0.6`; EWMA `alpha=0.35`; fusion `0.55*w+0.45*h` | Works as rules, not claimed AI | Misleadingly demonstrated |
| Offline queue flush | Exists (`AppStateContext.jsx:197-218` awaits + retains failures) but **masked** because `submitEscalation` catch returns fake `accepted` (`api.js:117-120`) | UNVERIFIED, likely always "succeeds" | Not convincing |
| Erasure / DPDP | Partial — `device_api.py` deletes cases, ignores `confirmation_token`, leaves interventions/identity, audit retains pseudonym | Partial | Weak |
| Biometric / HRMS / push alerts / mobile native / retraining loop | **Not implemented** | No | No |

### Critical finding: universal mock fallback
**Every** `api.js` function catches backend failure and returns plausible fake data:

- `loginWithCredentials:40-61` → `mock-demo-token` + role from ID prefix
- `attestDevice:77-83`, `fetchRiskBand:92-102`, `submitEscalation:117-120` (`CASE-LOCAL-xxxx`), `submitSelfReferral:135-137`, `requestDataPurge:148-150`, `fetchWelfareCases:163-222` (4 hardcoded cases), `fetchCaseDetail:231-296`, `logWelfareIntervention:313-324`, `submitOfficerLabel:340-342`, heatmap/cohesion/stats/audit/break-glass mocks (`api.js:354-619`).

Effect: **the UI can never visibly fail.** An evaluator cannot distinguish live backend from offline mock. `LoginPortal.jsx:11-13` pre-fills `ServicePass@2026` so happy path always works.

### Other verified gaps
- Secrets committed: `.env` + `backend/.env` + `backend/.env.example` identical, with `JWT_SECRET=development-...`, `WELFARE_OFFICER_PIN=9481`, `MEDICAL_OFFICER_PIN=6205`, `ADJUTANT_PIN=8821`; same password `ServicePass@2026` in `auth_api.py:82`, `LoginPortal.jsx:13`, tests; `.db` files committed despite `.gitignore:58-62,90-92`.
- `identity_api.py:30-32` + `api.js:492-494` + `BreakGlassModal.jsx` expose demo PINs to any authenticated client.
- Seeding is 4 hardcoded cases (`main.py:46-52`, `opened_at=2026-09-11T09:30:00Z:67`); prod (`DEMO_MODE=false`) boots empty with no cohort/model/registry.
- No Dockerfile, no CI, no Alembic (`database.py:113-114` = `create_all`), `requirements.txt` unpinned `>=`, missing `python-dotenv`, no `pytest/httpx/alembic/gunicorn/structlog`.
- Tests: 6 pure unit tests only (`test_backend.py:19-130`), no HTTP/RBAC/DB/persistence/concurrency/JWT-expiry/rate-limit/erasure tests; `verify_endpoints.py` manual happy-path smoke; `benchmark_perf.py:11-13` **disables rate limiting before measuring** and asserts only `200`.

---

## PHASE 3: SIH EVALUATION (strict, 500-team standard)

### A. Problem Understanding & Relevance — 11/15
- **Evidence:** deployment contexts (CI/border/public-order/static in `synthetic_generator.py:10-47`), post-leave hazard curve `:78-82`, leave-denial coupling `:70-73`, night-shift/variance features.
- **Strong:** welfare-not-disciplinary framing, anti-stigma via reason codes, Tele-MANAS 14416 linkage.
- **Weak / costing 4 pts:** no HRMS schema mapping, no force SOP integration, biometric/mobile as sliders.

### B. Completeness — 9/15
- **Evidence:** all 8 PS components have *some* code.
- **Strong:** end-to-end flag→triage→intervene→audit loop navigable via `App.jsx:69-82`.
- **Weak / costing 6 pts:** mobile=browser, biometrics absent, alerts=no push, recommendations=static, outcome tracking absent, HRMS simulated.

### C. Innovation / Differentiation — 11/15
- **Evidence:** Z0 on-device + reason-code-only egress (`AppStateContext.jsx:263-274`, `reason_codes.py:97-98`), dual-custody break-glass (`security.py`), k-anon + complementary suppression (`k_anonymity.py:36+`), hash-chained audit.
- **Strong:** privacy stack rare among student CRUDs, answers PS challenges 1,2,5,6.
- **Weak / costing 4 pts:** ML conventional; INT8/SHAP labels inflated.

### D. Technical Depth — 8/15
- **Evidence:** FastAPI + SQLAlchemy + JWT + slowapi (`main.py:94-97`), GBR(75, depth 4) (`hr_risk_model.py:31-36`), robust-z calibration (`:62-76`), SHA-256 chain.
- **Strong:** unit-relative calibration avoids whole-battalion flagging; audit persistence real.
- **Weak / costing 7 pts:** circular training, no metrics/threshold tuning, rules-as-AI, filter-in-Python `welfare_api.py:41-43`, no migrations.

### E. Real-World Feasibility — 6/10
- **Evidence:** role workflows map to officer/commander/auditor; intervention kinds plausible.
- **Weak / costing 4 pts:** no HRMS adapter, no roster integration, no referral SLA, prod boots empty, registry volatile.

### F. Scalability & Deployment — 4/10
- **Evidence:** Postgres branch `database.py:102-108`, slowapi present.
- **Weak / costing 6 pts:** SQLite default; no Dockerfile/compose/k8s/CI/CD; `create_all`; committed `.db`; `GET /health` static (`main.py:127-129`); no `/ready`, observability, pinned deps.

### G. UI/UX & Demo Quality — 7/10
- **Evidence:** clean theme, `CasesView.jsx:88-120` table + filter + search, full-page detail, `ErrorBoundary` (`App.jsx:55`).
- **Strong:** queue visible quickly; persona quick-fill fast.
- **Weak / costing 3 pts:** jargon (Z0/Z1, weak-label), UUID prominence, mocks mask failures, portal-switching role-play.

### H. Security, Reliability & Robustness — 3/5
- **Evidence:** PBKDF2 210k + compare_digest (`auth.py:19-25`), per-router auth, slowapi, 401 token wipe (`api.js:14-16`).
- **Weak / costing 2 pts:** committed secrets, hardcoded password, PIN disclosure, ignored confirmation token, audit mutators, SQLite, no encryption-at-rest.

### I. Documentation & Presentation — 3/5
- **Evidence:** `Project.md` (468 lines) thorough.
- **Weak / costing 2 pts:** overclaims (migrations, structured logging, Vault, autoscaling — absent); no judge-ready narrative/metrics/threat-model slides.

**Total: 62/100.**

| Category | Score | Max | Main reason |
|---|---|---|---|
| A Problem understanding | 11 | 15 | Good domain modeling, no HRMS/mobile/biometric depth |
| B Completeness | 9 | 15 | All components present, 3+ mock/simulated |
| C Innovation | 11 | 15 | Real privacy stack; AI labels inflated |
| D Technical depth | 8 | 15 | Solid backend, circular ML, no eval metrics |
| E Feasibility | 6 | 10 | Plausible workflow, no integration/ops story |
| F Scalability/deploy | 4 | 10 | No container/CI/migration/observability |
| G UI/UX/demo | 7 | 10 | Polished but mock-masked + jargon |
| H Security/robustness | 3 | 5 | Good primitives, committed secrets + PIN leak |
| I Docs/presentation | 3 | 5 | Thorough but overclaims vs code |

---

## PHASE 4: WHY WOULD THEY REJECT US? (ranked)

### CRITICAL

1. **Demo integrity: UI cannot fail (universal mock fallback).**
   Where: `frontend/src/services/api.js:40-61,77-83,92-102,117-120,135-150,163-296,313-342,354-619`.
   Why care: "turn off backend?" — app still shows cases/heatmap/audit. Looks fabricated. Costs ~8 pts. Competitor with honest offline banner wins trust.

2. **Secrets + credentials in repo + PIN disclosure API.**
   Where: `.env`, `backend/.env`, `auth_api.py:82`, `LoginPortal.jsx:13`, `identity_api.py:30-32`, `api.js:492-494`, `BreakGlassModal.jsx`.
   Why care: psych-data for armed forces with shared password + PINs in git = instant fail. Costs ~6 pts.

3. **ML circularity + zero evaluation.**
   Where: `synthetic_generator.py:91-101` (label = formula of features) → `hr_risk_model.py:26-38`; no precision/recall/FP/FN, thresholds hardcoded.
   Why care: PS demands FP/FN minimization + transparent AI. Costs ~7 pts.

### HIGH

4. **No HRMS / biometric / mobile integration.**
   Where: absence across repo; sliders in `PersonnelView.jsx:27-30`. Costs ~5 pts.
5. **Recommendations static, no closed loop.**
   Where: `reason_codes.py`; `welfare_api.py:103-153` (`notes_sanitized` trusted). Judge: "did it work?" — no answer. Costs ~4 pts.
6. **Production boots empty; registry volatile.**
   Where: `main.py:27-31`, `security.py:35`. Costs ~3 pts.
7. **Deployment readiness absent.**
   Where: no Dockerfile/CI/Alembic; `database.py:113-114`; trivial health. Costs ~4 pts.

### MEDIUM

8. **On-device "AI" mislabeling** (`localModel.js`). Costs ~2 pts — rename honestly.
9. **Commander analytics are arithmetic** (`command_api.py:28,30-33,36-39,43,51`). Costs ~2 pts.
10. **Audit tamper/restore as callable endpoints** (`audit_api.py:28,43-46`). Costs ~1 pt.
11. **Jargon + UUID prominence** (`AppStateContext.jsx:16-65`). Costs ~1-2 pts.
12. **Tests only happy-unit; benchmark disables protection** (`benchmark_perf.py:11-13`). Costs ~2 pts.

### LOW

13. Pre-filled password, footer theater, `confirmation_token='CONFIRMED'` (`api.js:145`), stub attestation (`device_api.py:30-36`), `get_personnel_by_pseudonym` miss → first-row leak. Aggregate prototype smell.

---

## PHASE 5: COMPETITION TEST

- **Basic CRUD dashboard:** simpler demo. We beat them on privacy/audit — if we lead with those.
- **Polished dashboard:** 30-sec wow. We lose on visuals alone — our heatmap numbers are formulas.
- **AI-heavy (LLM chatbot + metrics slides):** buzzword wow. We lose on "AI theater" unless we pivot to honest metrics; our no-LLM choice is correct but unproven.
- **Government-integrated (HRMS CSV + APK + SMS):** most dangerous — owns deployment credibility we lack.
- **Technically sophisticated (FL / DP-noise / ONNX + eval):** our keyword-EWMA-sum collapses on "show model card."
- **Scalable architecture (Docker + Postgres + CI + load graphs):** wins "ready to deploy" checkbox we cannot tick.
- **Data-driven (outcome tracking + FP/FN dashboard + roster optimizer):** wins measurable impact; we log but measure nothing.

**Stand-out:** (a) reason-code-only egress in code, (b) dual-custody break-glass + audit, (c) k-anon gating commander views, (d) hash audit with live verify. Lead with privacy-trust, not "AI predicts stress."

---

## PHASE 6: DEMO TEST (only what exists today)

1. **First 30s:** Login as Welfare Officer → queue (`CasesView`), 4 cases, critical first. Count + tier filter.
2. **Wow:** break-glass dual-custody reveal + audit verify → tamper → fail → restore.
3. **Strongest proof:** open critical → reason cards + actions → log intervention → label `true_concern/false_alarm`.
4. **Boring/confusing:** heatmap numbers if questioned, check-in sliders ("any form does this"), hash details >20s, portal-switching role-play.
5. **Judge will ask:** HRMS source, APK, biometrics, FP/FN, post-intervention outcome, identity visibility, break-glass abuse, offline, scale, retention.
6. **Exposers:** "precision/recall?" (none), "disconnect backend?" (mock logs in), "HRMS import?" (none), "push alert?" (toast), "restart prod?" (empty + registry lost).
7. **SUPPORTED claims:** role-gated views; whitelisted codes only (`validate_reason_codes`); aggregates suppress n<20; every action hash-audited; dual-custody to reveal; unit-relative calibration.
8. **NEVER claim:** INT8 engine, SHAP, accuracy %, mobile app, wearables, HRMS integrated, production-ready/scalable/encrypted-at-rest, real-time alerts, retraining from feedback, DPDP-compliant deployment.

### Ideal 3–5 min flow (existing only)
- 0:00–0:30 Welfare login → queue: "1 critical, 2 elevated, 1 emerging."
- 0:30–1:30 Open critical → 3 reason cards → log counseling → label.
- 1:30–2:15 Break-glass → reveal → audit entry.
- 2:15–3:00 Commander → heatmap → suppressed outpost (n=14).
- 3:00–3:40 Personnel → check-in + Hindi journal (`थकान`) → egress payload.
- 3:40–4:30 Auditor → verify → tamper seq=1 → fail → restore → valid. Close: "support, not surveillance."

---

## PHASE 7: TECHNICAL DEEP DIVE

- **Architecture:** clean `routes/core/ml/models`, per-router auth. Logic leaks into routes (filter-in-Python, hardcoded bands).
- **API:** REST-ish `/v1/*`, JWT, idempotency-key — good. Contracts weak: `schemas.py:5-88` bare `str`, no enums; tier/origin/detected_at unchecked; path/body `case_id` mismatch unchecked; `notes_sanitized` unsanitized.
- **DB:** clean models + WAL; no migrations, no idempotency TTL, missing `(tier,status)` index, no break-glass isolation.
- **AuthN/Z:** PBKDF2 + HS256 + require_roles real. Gaps: demo auto-provision any ID (`auth_api.py:94-109`), weak demo secret, no refresh/rotation/lockout.
- **Validation/errors:** inconsistent; `KeyError` paths (`hr_risk_model.py:48-57,81`, `auth.py:41-43`); `int(os.getenv())` crash (`config.py:16`).
- **Security:** slowapi real. Negated by secrets, PIN API, stub attestation, erasure gaps, audit mutators.
- **Scale/cache/concurrency:** cohesion cache keyed by `len` only; no pooling proof default; no pagination beyond `limit 1-500`; no workers.
- **Observability/deploy:** none — no structured logs/correlation/metrics/tracing/Dockerfile/CI/`/ready`.
- **Dependencies:** unpinned, missing `python-dotenv`, no lockfile/audit.

---

## PHASE 8: AI/ML AUDIT

- **Problem:** 9 HR features → score → unit-relative band + rule codes.
- **ML vs rules:** weak justification — codes ARE rules (`>60d`, `>0.40`, `7-21d`, `>90h`); GBR only smooths score. Pure rules nearly as explainable.
- **Data:** 1200 synthetic; label = formula of inputs + noise (`synthetic_generator.py:91-101`). No external validity.
- **Evaluation:** none — no split, RMSE/MAE, PR/ROC, calibration, FP/FN @ tau, ablation, or PHQ-9/GAD-7 comparison.
- **Limits:** circularity, seed 42, 4-context bias, compliance drops with stress (highest-risk stop reporting), `mad=0` risk, `KeyError` paths.
- **Imbalance/leakage:** acute `latent>0.82` leaks via mood/sleep coupling; no imbalance handling.
- **Explainability:** plain-language codes good; NOT SHAP — `factor_weights` are constants.
- **Trust:** no confidence/uncertainty, trajectory, or history. Override (`officer_label`) never retrains.
- **When wrong:** FP → stigma/wasted bandwidth; FN → missed crisis. No second-review/confidence-gating/RMO SLA.
- **Integrated or demo?** Integrated in path but frozen after synthetic boot. "Learning system" unsupported.

Verdict: **rules with GBR veneer.** Honest framing ("calibrated bands + rule attributions + feedback captured for future retraining") defensible; current framing not.

---

## PHASE 9: REAL-WORLD DEPLOYMENT TEST

- **Who operates/enters/consumes?** Unanswered. Demo seeds itself.
- **10x (12k):** boot retrain slows, Python filters + unpaginated views degrade, SQLite contends, audit unbounded.
- **100x:** single `uvicorn 127.0.0.1:8000` (`run_server.py:9`) falls over; no workers/Postgres proof/Redis/queue/replicas.
- **API failure:** frontend lies (mock success). Outbox `useState`-only, lost on refresh; no backoff/DLQ.
- **Bad data:** weak Pydantic → 500s; future `detected_at` ok; free `kind/label` ok; token ignored.
- **Sensitive data:** TLS assumed; no at-rest encryption; PINs/password in git; over-collection (`blood_group/phone/base_location` in break-glass response).
- **AuthZ:** enforced but bypassable via demo auto-provision + offline mock.
- **Monitoring/updating:** none — redeploy + `create_all` risks loss.
- **Offline:** volatile outbox + mock mask; no IndexedDB/sync protocol.
- **Integrations/infra/cost:** need HRMS adapter, MDM, SMS/push, Postgres+backups+KMS, WORM audit, SOC. Unscoped; compliance cost (DPDP audit, pen-test, approvals) unaddressed.

Implemented: role gating, pseudonymization, k-suppression, audit, basic rate limiting. Rest = future.

---

## PHASE 10: FINAL VERDICT

### 1. Overall: 62/100
### 2. Breakdown

| Category | Score | Max | Main reason |
|---|---|---|---|
| A Problem understanding | 11 | 15 | Good domain modeling, no HRMS/mobile/biometric depth |
| B Completeness | 9 | 15 | All components present, 3+ mock/simulated |
| C Innovation | 11 | 15 | Real privacy stack; AI labels inflated |
| D Technical depth | 8 | 15 | Solid backend, circular ML, no eval metrics |
| E Feasibility | 6 | 10 | Plausible workflow, no integration/ops story |
| F Scalability/deploy | 4 | 10 | No container/CI/migration/observability |
| G UI/UX/demo | 7 | 10 | Polished but mock-masked + jargon |
| H Security/robustness | 3 | 5 | Good primitives, committed secrets + PIN leak |
| I Docs/presentation | 3 | 5 | Thorough but overclaims vs code |

### 3. Maturity: **Working prototype**
Full role journeys navigate with real backend primitives, but data seeded (4 cases), integrations simulated, ML unevaluated/circular, secrets committed, no container/CI/migration, UI masks failures. Strong prototype needs honest offline states + measured model + HRMS adapter + secrets hygiene. Near-production needs Postgres/migrations/observability/pen-test on top.

### 4. Selection competitiveness
**Edge:** code-real privacy-trust story directly mapping PS hard constraints — rare in SIH rooms.
**Blockers:** mock-masked demo + credentials + unevaluated ML + no HRMS/mobile/biometric/push + no deployment artifacts.
Must change: remove mock fallbacks, purge secrets/db, publish model-eval page, show one real ingestion path, add Dockerfile + migration + `/ready` + CI.

---

## PHASE 11: THE 80/20 FIX LIST

### P0 — MUST FIX BEFORE SUBMISSION

1. **Kill deceptive mock fallbacks; fail honestly.**
   Problem: `api.js` universal mocks. Change: gate behind `VITE_DEMO_FALLBACK=false` default-off + "OFFLINE" banner + real errors; login/escalation must surface failure. Why: trust. Impact: +6-8. Files: `services/api.js`, `AppStateContext.jsx`, `LoginPortal.jsx`. Difficulty: Easy.
2. **Purge secrets + break PIN exposure.**
   Problem: committed `.env/.db`, shared password, PIN API. Change: `git rm --cached`, rotate, placeholder `.env.example`, drop `demo_pin` from response/UI, drop pre-filled password. Why: forces-data security. Impact: +5-6. Files: `identity_api.py:30-32`, `api.js:484-498`, `BreakGlassModal.jsx`, `LoginPortal.jsx`. Difficulty: Easy (history scrub Medium).
3. **Publish minimal model card + fix AI labels.**
   Problem: no metrics + false SHAP/INT8. Change: `ModelCard.md` + panel: holdout RMSE, FP/FN @ taus, calibration note, "rules not SHAP"; rename UI "Why flagged"/"Your assessment"/"On-device check". Why: FP/FN + transparency. Impact: +5. Files: `hr_risk_model.py`, eval script, detail/personnel views. Difficulty: Medium.
4. **Close feedback loop honestly.**
   Problem: `officer_label` dead-ends. Change: retrain job + version bump, OR label "captured for future retraining (not active)". Why: learning claim. Impact: +2-3. Files: `welfare_api.py:142+`, `hr_risk_model.py`. Difficulty: Easy (honest label) / Medium-Hard (real retrain).

### P1 — HIGH IMPACT
5. **One real integration.** HRMS CSV import (9 `FEATURE_COLS`) OR APK link OR SMS/push hook for critical. Why: PS pillar. Impact: +4-5. Difficulty: Medium.
6. **Outcome tracking.** `open→in_review→intervention_active→closed` + follow-up + outcome scale. Why: measurable benefit. Impact: +3-4. Files: `schemas.py`, `welfare_api.py`, `CasesView.jsx`. Difficulty: Medium.
7. **Defensible commander numbers.** Replace `friction*10` with documented aggregates + tooltips. Why: survive "where is 7.8 from?" Impact: +2-3. Files: `command_api.py`. Difficulty: Easy-Medium.
8. **Persist outbox + registry.** IndexedDB outbox; DB-backed `IdentityRegistry`. Why: offline + restart. Impact: +2-3. Difficulty: Medium.

### P2 — GOOD TO HAVE
9. Dockerfile + compose + Alembic + `/ready` + pinned deps + CI (pytest/build/bandit). Impact: +3. Difficulty: Medium.
10. Confidence + trajectory in detail: `raw_score`, `robust_z`, cutoffs, sparkline. Impact: +2. Difficulty: Easy-Medium.
11. Audit hardening: `DEMO_MODE`-gate tamper endpoints; `restore-chain` must re-verify. Impact: +1-2. Difficulty: Easy.

### P3 — POLISH
12. Hide UUIDs from queue, relative times, density pass, drop pre-filled creds, de-theater footer. Difficulty: Easy.
13. Input hardening: enums/patterns, `detected_at` recency, sanitize notes, miss → 404 (not first-row). Difficulty: Easy-Medium.

Order P0: 1 → 2 → 3 → 4.

---

## IF I WERE THE JUDGE

1. **"Precision/recall and FP/FN at current thresholds?"**
   Why: PS challenge #3. Exposes: no eval. Evidence: `hr_risk_model.py`, no eval script. **Missing.**
2. **"Disconnect backend and log in / escalate. What should I see?"**
   Why: demo honesty. Exposes: `api.js:40-61,117-120`. **Weak.**
3. **"Show HRMS integration. Schema? Cadence?"**
   Why: PS scope #6. Exposes: synthetic-only 9 features. **Missing.**
4. **"Where is the mobile app? Biometrics source?"**
   Why: PS mobile + biometrics. Exposes: browser + sliders. **Weak.**
5. **"Show SHAP values and quantized model for your SHAP/INT8 claims."**
   Why: AI honesty. Exposes: keyword lists + constants. **Weak.**
6. **"Why GBR over rules, when codes are threshold rules?"**
   Why: ML necessity. Exposes: `hr_risk_model.py:81-99`. **Partial.**
7. **"Officer labels false_alarm — what changes, when?"**
   Why: learning loop. Exposes: stored, never used. **Weak.**
8. **"Who can de-anonymize? What stops one rogue officer? Show code + UI."**
   Why: privacy core. Exposes: `security.py:63-108` dual+distinct+audit. **Strong.** Follow-up PINs endpoint: **Weak.**
9. **"14-person outpost opens heatmap — what do they see, why?"**
   Why: k-anon reality. Exposes: `k_anonymity.py:7-36` + suppressed row. **Strong.**
10. **"`.env` + `.db` committed with PINs/password. Secret management for deployment?"**
    Why: forces-data fitness. Exposes: committed secrets + `ServicePass@2026` + PIN API. **Weak.**
11. **"After intervention, how do you know it worked? Show outcome + rebalancing."**
    Why: measurability. Exposes: log-only. **Weak.**
12. **"Deploy to 50k across 5 forces tomorrow. What breaks first? Infra needed?"**
    Why: scale/deploy. Exposes: SQLite, `create_all`, no Docker/CI, trivial health, in-memory registry. **Weak.**
