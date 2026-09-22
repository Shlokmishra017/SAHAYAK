# Sahayak HR Risk Model Card — `sahayak-hr-gbr-v2.0-synthetic`

## Intended use

Welfare-support triage only: rank HR/wellness indicator patterns so authorized
welfare officers can prioritize human review. The model outputs a raw score
that is calibrated per unit into a risk band (0-4) plus rule-based reason
codes. A human officer always decides the intervention.

## Non-intended use

- Not a medical or mental-health diagnosis. Never present a band as a diagnosis.
- Not surveillance or disciplinary evidence.
- Not validated for any real population (see synthetic-data limitations).
- Do not use bands for postings, promotions, or punitive action.

## Feature list (9 HR indicators)

`consecutive_days_deployed`, `rest_ratio_28d`, `leave_denial_ratio`,
`days_since_leave_return`, `transfers_36m`, `family_colocated`,
`night_duty_hours_28d`, `duty_hour_variance_28d`, `promotion_stagnation_yrs`.

## Data source

Synthetic cohort only (`backend/app/ml/synthetic_generator.py`, seed 42,
n=1200 across 4 illustrative deployment contexts). Feature distributions,
context assumptions, and the latent-risk process are documented in the module
docstring. The binary label is `needs_review = latent_stress_index >= 0.65`
(prevalence ~0.31, minority class preserved). Hidden factors (life-event
shock, resilience trait, base jitter) plus noise keep the label from being a
trivial inversion of the features.

## Synthetic-data limitations

Current evaluation is **not external real-world validation**. Synthetic
metrics describe self-consistency of the pipeline on fabricated data, not
clinical or operational performance. Deployment requires evaluation on real,
consented, authority-held data with ethics and privacy review.

## Training procedure

- Deterministic stratified split (seed 42): 720 train / 240 validation /
  240 test, stratified on the review label.
- Model: sklearn GradientBoostingRegressor
  (`n_estimators=75, max_depth=4, learning_rate=0.08, random_state=42`).
  Not LightGBM, not a neural network, not quantized.
- Preprocessing: `family_colocated` cast to int; no scaling (tree model).
- Decision-cut sweep (band>=1..4) on **validation only**; final regressor
  refit on train+validation; test reported once.
- Calibration: unit-relative robust-z (median/MAD per context) computed on
  the predictor's own raw-score output (train+validation frame), because
  regression outputs shrink toward the mean and latent-value statistics would
  compress all predictions into the middle bands.

## Validation procedure

Reproduce with (from `backend/`):

```text
python eval_model.py --seed 42 --n 1200
```

## Metrics (held-out synthetic test, n=240, seed 42, operational cut band>=3)

| metric | value |
|---|---|
| precision | 0.429 |
| recall | 0.160 |
| F1 | 0.233 |
| confusion (TN/FP/FN/TP) | 149 / 16 / 63 / 12 |
| ROC-AUC | 0.883 |
| PR-AUC | 0.746 |

Validation cut sweep (F1): band>=1: 0.479 · band>=2: 0.410 ·
band>=3: 0.216 · band>=4: 0.101.

Calibration by score bin (predicted → observed positive rate):
[0.0-0.2]: 0.175→0.000 (n=13) · [0.2-0.4]: 0.308→0.000 (n=63) ·
[0.4-0.6]: 0.491→0.206 (n=63) · [0.6-0.8]: 0.689→0.584 (n=89) ·
[0.8-1.0]: 0.859→0.833 (n=12). Low-score bins are over-confident; high-score
bins track observed rates reasonably on synthetic data.

## Threshold rationale

Validation F1 peaks at band>=1, but that cut flags most personnel and would
overwhelm welfare-officer capacity while eroding trust through unnecessary
reviews. The operational cut band>=3 is a capacity/precision trade-off:
fewer, higher-confidence reviews. The price is lower recall (test: 0.160), so
missed concerns must also be caught by self-referral, commander signals, and
the follow-up rhythm. Accuracy alone does not govern this choice.

Welfare reading of errors:

```text
False positive: unnecessary welfare review / officer workload / possible stigma
False negative: missed welfare concern / delayed support
```

## Known failure modes

- Under-predicts for personnel whose risk comes mostly from hidden life
  events (unobservable by design).
- Unit baselines with < 20 samples yield `insufficient_history` confidence
  instead of a firm band.
- Single-point assessments have no trend (`insufficient_history`).
- Synthetic-trained: real-world drift (different leave/roster regimes) will
  degrade performance until retrained on operational data.

## Fairness limitations

No fairness evaluation has been performed. Context base rates differ by
design; unit-relative calibration reduces wholesale flagging of high-tempo
units but does not guarantee equal error rates across rank, gender, or
posting type. Required before operational use.

## Privacy considerations

Risk-band endpoint exposes band + whitelisted reason codes only — no journal
text, no continuous scores. Break-glass disclosure is minimum-necessary and
dual-custody. Small cohorts (n < 20) are suppressed in commander aggregates.

## Human oversight

Every band above the cut creates a case for human review; interventions and
outcomes are recorded by officers. Officer labels are stored for evaluation
and future retraining — they do not update this model.

## Retraining policy

No automatic retraining. Candidate models train offline on versioned,
validated label sets, are evaluated against the current model, and require
explicit approval before promotion.

## Current version

`sahayak-hr-gbr-v2.0-synthetic` — gradient-boosted regression on synthetic
data with unit-relative calibration and rule-based reason codes.
