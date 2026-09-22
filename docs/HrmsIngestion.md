# HRMS-Ready Ingestion Adapter (Phase 3)

> "Sahayak provides an HRMS-ready ingestion adapter using validated exports.
> The deployment adapter can be connected to the authority's actual HRMS."
> This is NOT a live government HRMS integration.

## Pipeline

```text
HRMS export CSV
  → schema validation (required/optional columns)
  → row validation (ranges, dates, units) + invalid-row report
  → duplicate handling (within-file + stable re-import)
  → feature mapping → risk calculation (same engine, global fallback baseline)
  → case creation/update (band ≥ 2) → summary → audit event
```

## Columns

Required: `service_number, full_name, consecutive_days_deployed,
rest_ratio_28d, leave_denial_ratio, days_since_leave_return, transfers_36m,
family_colocated, night_duty_hours_28d, duty_hour_variance_28d,
promotion_stagnation_yrs`.
Optional: `rank, unit, record_date` (ISO YYYY-MM-DD).

Ranges: rest/denial 0–1; deployment 0–365d; transfers 0–20; night duty
0–300h; variance 0–100; stagnation 0–40yrs; family in
yes/no/true/false/1/0. Limits: 5000 rows / 2MB per file.

## Identity & duplicates

Pseudonym is deterministic: `uuid5(service_number)`. Re-importing the same
`service_number` updates the open case instead of duplicating it. Within-file
duplicates are rejected with a row-level error.

## Case policy

Band 4 → critical, 3 → elevated, 2 → emerging (origin `hr_channel`).
Bands 0–1 are counted as below-threshold (no case). Review priority still
follows the operational cut (band ≥ 3, see ModelCard).

## Demo

1. Welfare login → HRMS import → upload `backend/artifacts/hrms_sample.csv`
   (contains a high-risk, a steady, an invalid, a duplicate, and a night-load row).
2. See `Imported/Updated/New/Rejected` + invalid-row report.
3. Open Cases: new `CASE-HRMS-*` rows with reason codes — no DB editing.
4. Re-upload the same file: rows flip from new to updated.

Endpoints: `GET /v1/hrms/template`, `GET /v1/hrms/sample-csv`,
`POST /v1/hrms/import` (multipart, welfare-officer only, audited).
