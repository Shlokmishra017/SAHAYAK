# Failure Drills (Phase 5, plan 6.4)

The system must fail safely and visibly: no fabricated success, no crash,
no silent data loss, and an understandable message at every step.

## Automated drills

From `backend/`:

```text
python tests/failure_drill.py
```

Last run: **9/9 passed**. Each drill asserts status code + message shape:

| drill | expected safe failure |
|---|---|
| expired token | 401, no data |
| unauthorized role | 403, no case data in body |
| unauthenticated (backend-down contract) | 401 JSON `Authentication required` → UI shows Backend unavailable |
| invalid HRMS row | file accepted, row rejected with row-level reason |
| duplicate HRMS import | second import updates, exactly one open case per service number |
| small cohort | suppressed item, aggregates null |
| tampered audit | verify false with block seq, restore heals to true |
| database unreachable | `/ready` 503 with `ready: false`, `/health` stays process-only |
| invalid confirmation token | 400 with `CONFIRM-<pseudonym_id>` guidance |

## Manual browser drills (demo day)

1. **Backend down**: stop the API, reload the app, try login → red
   "Backend unavailable" banner; no mock user, no queue. Restart API →
   Retry succeeds.
2. **Network disconnected**: DevTools → Offline, submit a personnel
   escalation → "saved locally" toast + pending-count chip in AppShell.
   Go online → auto-sync + "synced" toast. Reload mid-queue → entries
   survive (IndexedDB), Sync now drains them.
3. **Invalid HRMS row**: Welfare login → HRMS import → upload
   `backend/artifacts/hrms_sample.csv` → summary shows Rejected = 2 with
   reasons; valid rows still import.
4. **Expired token**: wait > JWT expiry (or edit `sahayak_access_token`
   in DevTools) → next action redirects to login with 401 handling.
5. **Small cohort**: Commander login → Team pulse → detached outposts show
   "Redacted (n=14)".
6. **Tampered audit**: Auditor login → Audit ledger → Simulate tampering →
   breach banner names block 1 → Restore clean chain → verified intact.
