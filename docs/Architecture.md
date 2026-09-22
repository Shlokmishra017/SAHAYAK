# Sahayak Architecture (as implemented)

```text
Personnel PWA (React + service worker + IndexedDB outbox)
  |  HTTPS (TLS terminates at deployment reverse proxy)
  v
API (FastAPI): Auth (JWT) + RBAC
  |-- Device gateway: attest / risk-band / escalations / self-referral / erasure
  |-- Welfare: cases / interventions / outcomes / status machine / labels
  |-- HRMS ingestion adapter: validated CSV exports -> cases
  |-- Commander: measured aggregates (k-suppressed) + cohesion signals
  |-- Identity broker: dual-custody break-glass (persistent registry)
  |-- Alerts: critical-signal events (+SMTP when configured) / ack
  |-- Audit: hash-chained ledger / verify / tamper-simulation / restore
  v
Risk engine: HR features -> validation -> GBR raw score -> unit-relative
calibration (predictor-output baselines) -> band + RULE-based reason codes
  + confidence (insufficient_history) + trajectory from recorded history
  v
PostgreSQL (prod, Alembic migrations) / SQLite (local dev)
```

Cross-cutting: hash-chained audit ledger (persistent), RBAC on every
protected route, per-IP rate limits, small-cohort suppression (n<20),
idempotency keys, minimum-necessary disclosure, CI (tests/build/migration
check/secret scan), Docker compose (web -> api -> db).

What this diagram does NOT contain (no such components exist): native mobile
apps, wearable pipelines, live HRMS connectors, external push/SMS gateways,
secret managers, Kubernetes, log shippers, metrics collectors.
