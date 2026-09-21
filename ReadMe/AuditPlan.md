I’ll read the audit report first, then map each finding to the current codebase and turn the gaps into a prioritized implementation plan with concrete files, validation steps, and sequencing.

Read , lines 1 to 400

Read , lines 401 to 783

The audit’s main conclusion is consistent: backend substance is strong, while the largest remaining risk is workflow clarity and credibility in the frontend. I’m checking the current code for the audit’s named issues so the plan distinguishes already-addressed items from genuinely outstanding work.

Searched for regex `SHAP|Weak-Label|weak-label|INT8|Zero Raw Data|Z0|Z1|RBAC Guarded|On-Device Private|pseudonym_id|summary|Active monitored|Check-in Completion` (`**/frontend/src/**`), 44 results

Searched for regex `CaseDetailModal|activeCase|onClose` (`**/frontend/src/components/welfare/**`), 7 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

The audit is partly stale: the queue redesign already removed the old summary-card stack, pseudonym display from rows, and added a selected-case preview. The remaining high-impact gaps are still real: the case detail remains a modal, the false “INT8” claim remains, technical zone language leaks into user-facing screens, and the case workflow lacks a visible state/timeline model.

Read , lines 140 to 200

Read 

Read 

Read 

Read 

# Implementation Plan

The audit score is being held back mainly by frontend workflow friction and credibility gaps. The recent queue redesign already addressed several findings: summary cards are gone, queue filters are unified, pseudonyms are hidden from rows, relative times are used, and a selected-case preview exists.

## P0: Fix the primary welfare workflow

### 1. Replace modal case detail with a full-page investigation view
**Files:**
- `CaseList.jsx`
- `CaseDetailModal.jsx`
- `App.jsx`

**Implementation:**
- Add a welfare route/view state such as `cases` and `case-detail`.
- Clicking a queue row opens a full-page case investigation screen.
- Preserve the selected case in URL state if practical.
- Keep the modal pattern only for confirmations such as break-glass access.

**Acceptance criteria:**
- Officer can open a case with one click.
- Detail view uses the full content width.
- Browser/back navigation returns to the same queue state.
- No investigation content is constrained inside a 768px modal.

### 2. Consolidate the case detail into one operational page
Use this order:

1. Case header: ID, severity, unit, status, time open
2. **Why this case was flagged**
3. **Recommended action**
4. Inline intervention logging
5. Case history timeline
6. **Your assessment**
7. Privacy and identity access

Rename technical labels:
- `SHAP Attribution` → `Why this case was flagged`
- `Model Weak-Labeling` → `Your assessment`
- `Weight: High` → remove
- `Zero Raw Data Invariant` → remove from the main workflow

The existing reason explanations and intervention components are reusable:
- `InterventionLogger.jsx`
- `LabelFeedbackLoop.jsx`

### 3. Add a real case timeline
**Backend:**
- Extend the case detail response in `welfare_api.py`
- Include case creation, case access, interventions, assessment, and status changes.

**Frontend:**
- Render a chronological vertical timeline in the detail view.
- Use existing audit actions where available.
- Avoid inventing events that are not persisted.

**Acceptance criteria:**
- Timeline data comes from persisted backend records or audit entries.
- Each event has an action, timestamp, and actor category.
- Intervention logging immediately adds a timeline event.

### 4. Make case status progression explicit
Current backend behavior changes a case to `intervention_active` when an intervention is logged, but there is no explicit officer-facing state control.

Add:
- `open`
- `in_review`
- `intervention_active`
- `closed`

**Backend:**
- Add a status transition endpoint or extend the intervention workflow.
- Validate allowed transitions.
- Record every transition in the audit chain.

**Frontend:**
- Add a compact “Update status” control.
- Show current state separately from severity.

## P1: Remove misleading or technical UI language

### 5. Remove the false INT8 claim
**File:**
- `VoiceJournal.jsx`

Replace:

> On-device INT8 model processes sentiment vector locally

With:

> Text is analyzed on this device. Your journal is not uploaded.

Also rename:
- `Analyze On-Device` → `Analyze privately`
- `On-Device NLP Analysis` → `Local text analysis`

Do not call the implementation an ML model unless an actual model is added.

### 6. Remove architecture jargon from user-facing screens
Keep zone terminology in documentation and the auditor view, but remove or soften it in normal workflows.

Review:
- `AppShell.jsx`
- `AppStateContext.jsx`
- `LocalAnalytics.jsx`
- `LoginPortal.jsx`

Change user-facing language such as:
- `Z0 Zone: On-Device Wellness` → `Personnel wellness`
- `Z1 Zone: Welfare Triage Core` → `Welfare officer`
- `Z1 Zone: Commander Strategic Layer` → `Command readiness`
- `Z0 Enclave Active` → `Private device processing`

Keep the technical zone names in:
- `ZeroTrustInspector.jsx`
- audit documentation

### 7. Replace remaining technical AI claims
Review all frontend text for:
- SHAP
- INT8
- weak-labeling
- AI-powered claims unsupported by the implementation

Use plain operational language:
- “Risk factors”
- “Officer assessment”
- “Local text analysis”
- “Signal detected”
- “Recommended welfare action”

## P1: Improve trust and accessibility

### 8. Add uncertainty without inventing confidence scores
The current backend does not expose a calibrated probability or confidence interval, so do not display fake percentages.

Add a qualitative signal only if derived from existing data:
- `Immediate review`
- `Priority review`
- `Routine follow-up`

If a confidence indicator is required, add an explicit backend field with documented semantics first.

**Backend candidate:**
- Extend `schemas.py`
- Add model calibration metadata in `hr_risk_model.py`

### 9. Refactor the CSS token debt
The current device components still contain hardcoded dark-theme classes, while `index.css` overrides them with `!important`.

Refactor the device components to use:
- `var(--surface)`
- `var(--surface-subtle)`
- `var(--border)`
- `var(--text-primary)`
- `var(--brand)`
- `var(--warm)`

Prioritize:
- `VoiceJournal.jsx`
- `LocalAnalytics.jsx`
- `PersonnelWellnessDashboard.jsx`

Then remove obsolete hardcoded-color override rules from `index.css`.

### 10. Improve accessibility basics
Add:
- Skip-to-content link in `AppShell.jsx`
- `aria-label` for icon-only controls
- table semantics or `role="table"` for the custom queue
- minimum 12px body text
- stronger contrast for muted text
- keyboard focus for selected queue rows
- Escape-to-close behavior for confirmation modals

## P2: Close product and platform gaps

### 11. Improve intervention outcome tracking
Current intervention logging records the action but not its outcome.

Add fields such as:
- follow-up date
- outcome status
- officer follow-up note
- resolution reason

Update:
- `database.py`
- `welfare_api.py`
- `InterventionLogger.jsx`

### 12. Add real-time or persistent welfare alerts
The current queue refreshes when the role loads or data is manually refreshed.

Phase this safely:
1. Add polling with a visible “last updated” timestamp.
2. Add unread/new-case indicators.
3. Add WebSocket or server-sent events only if needed for the demo.
4. Add email/SMS/push integrations only after notification ownership and security are defined.

### 13. Improve model credibility
The audit correctly identifies the circular synthetic target problem.

Document the current model honestly:
- prototype trained on synthetic data
- not clinically validated
- risk tier is decision support, not diagnosis

Then, if time allows:
- separate synthetic generation from target calculation
- create held-out synthetic scenarios
- report precision, recall, calibration, and false-positive rates
- retain the officer feedback loop for future retraining

Relevant files:
- `hr_risk_model.py`
- `synthetic_generator.py`
- `benchmark_perf.py`

### 14. Strengthen production security boundaries
For a prototype, the current security story is strong. For production readiness:

- replace SQLite with PostgreSQL
- encrypt sensitive data at rest
- move secrets to managed secret storage
- add token expiry and refresh handling
- add structured audit persistence
- add migration tooling
- test erasure and break-glass authorization paths

Relevant files:
- `database.py`
- `auth.py`
- `security.py`
- `config.py`

## Recommended execution order

1. Full-page case investigation view
2. Case detail terminology cleanup
3. Timeline and explicit status progression
4. Remove INT8 and other unsupported claims
5. Remove user-facing zone jargon
6. Accessibility and typography pass
7. CSS token refactor
8. Intervention outcome tracking
9. Model evaluation documentation
10. Production security hardening

## Validation plan

After each phase:

- `npm run build`
- Run backend tests with `pytest`
- Test the officer flow:
  1. Login as welfare officer
  2. Open critical case
  3. Read reason and recommended action
  4. Log intervention
  5. Confirm timeline and status update
  6. Submit assessment
  7. Return to queue
- Test at `1920x1080`, `1440x900`, and `1366x768`
- Test keyboard navigation and mobile-width fallback

The highest-value next implementation is the full-page case investigation workflow. It addresses the audit’s single most important finding and lets the existing backend strengths become visible through a believable officer workflow.