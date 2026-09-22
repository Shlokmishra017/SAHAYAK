# Sahayak Limitations (read before judging or deploying)

Stating these increases credibility; hiding them would destroy it.

- **Synthetic training/evaluation data.** The risk model trains and reports
  metrics on fabricated data (`docs/ModelCard.md`: test P=0.429 R=0.160
  F1=0.233). This is not clinical or real-world validation.
- **No clinical diagnosis.** Welfare-support triage only. Bands and reason
  codes must never be presented as mental-health diagnosis.
- **No real wearable integration.** Self-reported indicators only; the
  wearable provider is a stub that refuses to fabricate data.
- **HRMS adapter, not live government HRMS.** Validated CSV exports only.
- **PWA, not a native application.** Installable, offline-capable web app.
- **Alerts are internal-first.** External e-mail delivery only when the
  deployment configures SMTP; no SMS/push gateway exists.
- **Labels don't retrain.** Officer labels/outcomes are stored for evaluation
  and future retraining; the production model never updates itself.
- **Single-process prototype.** One API + Postgres via compose; no
  autoscaling, Kubernetes, or load-test evidence.
- **No TLS/at-rest encryption in-app.** Transport security terminates at the
  deployment reverse proxy; no secret manager, WAF, or SOC wiring.
- **Fairness unevaluated.** No error-rate analysis across rank/gender/posting.
- **Needs deployment-authority approval** for HRMS connection, retention
  policy, MDM, backup regime, security assessment, and real-world validation
  before any operational use.
