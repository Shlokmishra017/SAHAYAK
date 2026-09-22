# Required Demo Dataset (Task 9)

Deterministic, clearly labeled, resettable. Never mixed with production
data: `seed_demo.py` refuses to run unless `DEMO_MODE=true`.

## Commands (from `backend/`)

```text
python seed_demo.py              # reset + seed (idempotent)
python seed_demo.py --reset-only # remove demo set (audit events retained)
```

## Scenarios (fixed `CASE-DEMO-*` ids, fixed pseudonyms, fixed dates)

| case | scenario | tier / status | proof |
|---|---|---|---|
| CASE-DEMO-EMERG | emerging + insufficient history | emerging / open | trajectory `insufficient_history` |
| CASE-DEMO-RISE1 → RISE2 | rising risk | emerging → elevated | trajectory `rising` |
| CASE-DEMO-STABLE | stable low + post-intervention improvement | elevated / closed | outcome `improved` 4/5 |
| CASE-DEMO-CRIT | critical risk | critical / open, acute marker | ALERT-DEMO-CRIT `recorded` |
| CASE-DEMO-PERSIST | persistent concern | elevated / follow_up_due | outcome `needs_follow_up` |
| heatmap outposts | small-cohort suppression | n=14 redacted | commander view |

Demo identities (`CAPF-D00001…5`) live in the identity registry so
dual-custody break-glass can be exercised on CASE-DEMO-CRIT.

## Demo flow mapping (4–5 minutes)

Problem → Personnel PWA (consent, check-in EN/हिंदी, offline save, sync) →
HRMS import (`artifacts/hrms_sample.csv` → welfare queue) → case with reason
codes → intervention → follow-up → outcome → commander aggregates +
suppression → break-glass + audit event → tamper/restore → architecture.
