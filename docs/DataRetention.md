# Sahayak — Data Erasure & Retention Policy (Phase 1)

This document defines what is erased, what is retained, and why.
It does not claim universal statutory compliance; the deployment
authority must finalize retention periods and legal review.

## Erasure request flow

```text
request purge (pseudonym_id + confirmation token CONFIRM-<pseudonym_id>)
→ token validated (invalid tokens rejected with 400)
→ authorized deletion (cases + linked interventions for that pseudonym)
→ audit event retained (no personal content)
→ response reports purged_cases / purged_interventions / retained
```

## What is erased

- All `cases` rows matching the requesting `pseudonym_id`.
- All `interventions` rows linked to those cases.

## What is retained

- One audit-ledger event (`ERASURE_PURGE_EXECUTED`) recording that a purge
  occurred, with counts only. No journal text, scores, or identity content.
- Reason: accountability — a tamper-evident record that personal data was
  removed, without retaining the personal data itself.

## What is NOT deleted by this endpoint

- Audit history for other pseudonyms.
- Break-glass registry entries (governed separately; deployment authority
  must define their retention).
- Backups, if configured by the deployer (must be covered by backup
  rotation policy).

## Who can request deletion

- The data principal (personnel, role `Z0_PERSONNEL`) for their own
  `pseudonym_id`.

## Confirmation tokens

- Tokens are not ignored. The client must supply
  `confirmation_token = "CONFIRM-<pseudonym_id>"`.
- UI must present an explicit confirmation step before sending.

## Intended retention (to be finalized by deployment authority)

- Operational cases: retained while the welfare workflow is active.
- Audit events: retained per authority audit policy (suggested minimum
  consistent with grievance/audit review windows).
- Break-glass grants: expire after `BREAK_GLASS_TTL_MINUTES` (default 15);
  registry rows marked `expired` after expiry.
