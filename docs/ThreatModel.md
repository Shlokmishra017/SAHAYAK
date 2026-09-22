# Sahayak Privacy & Threat Model

Scope: the prototype as implemented. Each item: threat → impact →
mitigation → residual risk.

## 1. Unauthorized officer access (wrong role reads cases)

Threat: personnel/commander token used against welfare endpoints.
Impact: exposure of pseudonymous welfare cases.
Mitigation: `require_roles` on every protected route; tested RBAC matrix
(Phase 5); JWT expiry enforced.
Residual: token theft on an unlocked device (see 6).

## 2. Insider misuse (authorized officer over-accesses)

Threat: welfare officer browses cases without welfare need.
Impact: privacy violation at scale.
Mitigation: every case-list/detail/break-glass access writes a hash-chained
audit event with actor hash; auditor view + verification.
Residual: audit is detective, not preventive; deployment needs access-review
process.

## 3. Re-identification via quasi-identifiers

Threat: unit + tier + timing combined to name a person.
Impact: de-anonymization without break-glass.
Mitigation: pseudonymous workflow, truncated pseudonym display,
minimum-necessary break-glass disclosure (no phone/blood/location).
Residual: small units remain vulnerable — see 4.

## 4. Small-cohort inference

Threat: commander filters to a 3-person group to isolate someone.
Impact: individual exposure through aggregates.
Mitigation: suppression at n<20 plus complementary suppression; tested.
Residual: repeated-query differencing across time is not defended; deploy
with query governance.

## 5. Compromised credentials

Threat: stolen password / custodian PIN.
Impact: role impersonation; break-glass requires TWO custodians so one
theft is insufficient by design.
Mitigation: PBKDF2 hashes, no PINs in API responses/UI/logs, rate limits
(10/min login, 5/min break-glass), distinct-identity enforcement.
Residual: no lockout/MFA; PINs live in env (secret manager is a deployment
concern).

## 6. Leaked / lost device (personnel phone)

Threat: journal/check-in data on a lost phone.
Impact: personal wellness disclosure.
Mitigation: on-device only (never uploaded), IndexedDB outbox holds only
minimal egress payloads (pseudonym+tier+codes), 50-entry cap, no journal text.
Residual: no device-level encryption/MDM in prototype.

## 7. Offline device data tampering

Threat: queued payloads edited before sync.
Impact: false cases.
Mitigation: server re-validates reason codes against whitelist; idempotency
keys bound to client event ids; audit logs intake.
Residual: no client attestation proof in prototype (endpoint accepts token).

## 8. Audit tampering

Threat: insider edits history to hide access.
Impact: loss of accountability.
Mitigation: SHA-256 hash chain persisted in DB; verify endpoint names the
broken block; tamper-simulation/restore drills; tested.
Residual: DB-write access can rewrite the whole chain; WORM/backup regime
is a deployment concern.

## 9. API abuse / DoS

Threat: mass login, import, or escalation floods.
Impact: brute force, resource exhaustion.
Mitigation: per-IP rate limits (tested 429 evidence), upload caps
(5000 rows/2MB), Pydantic validation.
Residual: no WAF/DDoS layer, single process; production needs both.

## 10. Data retention / erasure gaps

Threat: stale personal data kept beyond need.
Impact: privacy debt, principal-rights failure.
Mitigation: validated erasure endpoint (cases+interventions deleted, audit
event retained per `docs/DataRetention.md`); tested.
Residual: backups and break-glass registry retention need deployment policy.
