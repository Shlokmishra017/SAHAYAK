"""Server-side operational risk engine.

Conceptual pipeline (each stage is a separate method):

```text
HR / wellness inputs
        ↓
validation (feature presence check)
        ↓
feature preparation (ordered vector)
        ↓
risk model (gradient-boosted regression → raw score 0..1)
        ↓
calibration (unit-relative robust-z → band 0..4)
        ↓
unit-relative risk band + reason codes (RULES, not model explanations)
        ↓
officer recommendation (via reason-code metadata, human reviews)
```

Honesty notes:
- The model is sklearn GradientBoostingRegressor trained on SYNTHETIC data.
  It is not LightGBM (earlier version strings said "lgbm"; corrected), not a
  neural network, not INT8-quantized.
- Reason codes are hand-written operational threshold rules
  (e.g. deployed > 60 days). They are NOT SHAP values and NOT derived from
  the model. `factor_weights` are static documentation hints, not attributions.
- Officer labels are captured for evaluation/future retraining; they do not
  update this production model.
- Evaluation on synthetic data is NOT real-world validation (see ModelCard).
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedShuffleSplit

from app.core.reason_codes import validate_reason_codes
from app.ml.synthetic_generator import REVIEW_LABEL_THRESHOLD, add_review_label

MODEL_VERSION = "sahayak-hr-gbr-v2.0-synthetic"

# Operational decision cut: band >= 3 surfaces a case for welfare review.
# Selected on the VALIDATION split (see train_with_splits); test only reports.
OPERATIONAL_BAND_CUT = 3

# Below this many unit-baseline samples the calibration is not trustworthy and
# callers should surface "insufficient history" instead of a firm band.
MIN_BASELINE_SAMPLES = 20


class HRRiskEngine:
    FEATURE_COLS = [
        "consecutive_days_deployed",
        "rest_ratio_28d",
        "leave_denial_ratio",
        "days_since_leave_return",
        "transfers_36m",
        "family_colocated",
        "night_duty_hours_28d",
        "duty_hour_variance_28d",
        "promotion_stagnation_yrs",
    ]

    # Stage thresholds for the unit-relative calibration (robust-z cut points).
    CALIBRATION_CUTS = (-0.5, 0.5, 1.3, 2.0)

    def __init__(self):
        self.model: GradientBoostingRegressor | None = None
        self.is_trained: bool = False
        self.model_metadata: Dict = {"model_version": MODEL_VERSION}
        # Per-context median/MAD of the PREDICTOR's own raw-score output
        # (estimated on train data). Bands normalize predictions against what
        # the predictor typically outputs per unit; latent-value statistics
        # would compress shrunk regression outputs into the middle bands.
        self.pred_baselines: Dict[str, Dict] = {}

    # ---- pipeline stages ----

    def validate_inputs(self, record: Dict) -> List[str]:
        """Return list of missing required features (empty = valid)."""
        return [c for c in self.FEATURE_COLS if record.get(c) is None]

    def prepare_features(self, record: Dict) -> np.ndarray:
        return np.array([[
            record["consecutive_days_deployed"],
            record["rest_ratio_28d"],
            record["leave_denial_ratio"],
            record["days_since_leave_return"],
            record["transfers_36m"],
            1 if record["family_colocated"] else 0,
            record["night_duty_hours_28d"],
            record["duty_hour_variance_28d"],
            record["promotion_stagnation_yrs"],
        ]])

    def predict_raw_score(self, record: Dict) -> float:
        """Stage: risk model. Regression output clipped to [0, 1]."""
        if not self.is_trained:
            return float(np.clip(record.get("latent_stress_index", 0.5), 0.0, 1.0))
        raw = float(self.model.predict(self.prepare_features(record))[0])
        return float(np.clip(raw, 0.0, 1.0))

    def calibrate_band(self, raw_score: float, cohort_baseline: Dict) -> Tuple[int, float]:
        """Stage: unit-relative calibration. Returns (band 0..4, robust_z)."""
        median = cohort_baseline.get("median", 0.50)
        mad = cohort_baseline.get("mad", 0.12)
        robust_z = (raw_score - median) / (1.4826 * mad)
        c1, c2, c3, c4 = self.CALIBRATION_CUTS
        if robust_z < c1:
            band = 0
        elif robust_z < c2:
            band = 1
        elif robust_z < c3:
            band = 2
        elif robust_z < c4:
            band = 3
        else:
            band = 4
        return band, float(robust_z)

    def generate_reason_codes(self, record: Dict) -> Tuple[List[str], Dict[str, float]]:
        """Stage: rule-based reason codes.

        These are operational threshold rules, NOT model explanations. A code
        fires purely from its rule regardless of the model's raw score.
        """
        reason_codes = []
        factor_weights = {}

        if record["consecutive_days_deployed"] > 60:
            reason_codes.append("RC_SUSTAINED_DEPLOYMENT")
            factor_weights["consecutive_days_deployed"] = 0.35

        if record["leave_denial_ratio"] > 0.40:
            reason_codes.append("RC_DENIED_LEAVE_CLUSTER")
            factor_weights["leave_denial_ratio"] = 0.30

        if 7 <= record["days_since_leave_return"] <= 21:
            reason_codes.append("RC_POST_LEAVE_VULNERABILITY")
            factor_weights["post_leave_reentry"] = 0.25

        if record["night_duty_hours_28d"] > 90.0:
            reason_codes.append("RC_NIGHT_SHIFT_OVERLOAD")
            factor_weights["night_duty_hours"] = 0.20

        if record["transfers_36m"] >= 3 and not record["family_colocated"]:
            reason_codes.append("RC_FREQUENT_TRANSFER")
            factor_weights["frequent_relocation"] = 0.18

        return validate_reason_codes(reason_codes), factor_weights

    def assess_confidence(self, record: Dict, cohort_baseline: Dict) -> Tuple[str, str | None]:
        """Stage: confidence. Never force a firm band on inadequate evidence."""
        missing = self.validate_inputs(record)
        if missing:
            return "insufficient_history", f"Missing features: {', '.join(missing)}."
        n = cohort_baseline.get("count", 0)
        if n < MIN_BASELINE_SAMPLES:
            return (
                "insufficient_history",
                f"Unit baseline has only {n} samples (need {MIN_BASELINE_SAMPLES}).",
            )
        return "standard", None

    def resolve_baseline(self, record: Dict, fallback: Dict) -> Dict:
        """Prefer predictor-output baselines; fall back to cohort statistics."""
        if self.is_trained and record.get("force_type") in self.pred_baselines:
            return self.pred_baselines[record["force_type"]]
        return fallback

    def predict_individual_risk(
        self, record: Dict, cohort_baseline: Dict
    ) -> Tuple[float, int, List[str], Dict[str, float]]:
        """Full pipeline (kept for backward compatibility)."""
        raw_score = self.predict_raw_score(record)
        h_band, _ = self.calibrate_band(raw_score, self.resolve_baseline(record, cohort_baseline))
        reason_codes, factor_weights = self.generate_reason_codes(record)
        return raw_score, h_band, reason_codes, factor_weights

    def predict_with_confidence(self, record: Dict, cohort_baseline: Dict) -> Dict:
        """Full pipeline plus confidence/insufficient-data state."""
        baseline = self.resolve_baseline(record, cohort_baseline)
        raw_score = self.predict_raw_score(record)
        h_band, robust_z = self.calibrate_band(raw_score, baseline)
        reason_codes, factor_weights = self.generate_reason_codes(record)
        confidence, note = self.assess_confidence(record, baseline)
        return {
            "raw_score": raw_score,
            "h_band": h_band,
            "robust_z": robust_z,
            "reason_codes": reason_codes,
            "factor_weights": factor_weights,
            "confidence": confidence,
            "confidence_note": note,
            "model_version": MODEL_VERSION,
        }

    # ---- training / evaluation ----

    @staticmethod
    def _frame(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        labeled = add_review_label(df)
        X = labeled[HRRiskEngine.FEATURE_COLS].copy()
        X["family_colocated"] = X["family_colocated"].astype(int)
        return X.to_numpy(), labeled["needs_review"].to_numpy()

    def train_model(self, df: pd.DataFrame):
        """Legacy entry point: fit on the full frame (kept for compatibility).

        Prefer train_with_splits for any reported evaluation.
        """
        X, _ = self._frame(df)
        y = df["latent_stress_index"].values
        self.model = GradientBoostingRegressor(
            n_estimators=75, max_depth=4, learning_rate=0.08, random_state=42
        )
        self.model.fit(X, y)
        self.is_trained = True
        self.pred_baselines = _pred_baselines(self.model, df)
        self.model_metadata.update({
            "trained_on": "full_frame_no_splits",
            "n_samples": len(df),
            "note": "Legacy path; not used for reported metrics.",
        })

    def train_with_splits(
        self, df: pd.DataFrame, seed: int = 42,
        train_size: float = 0.6, val_size: float = 0.2,
    ) -> Dict:
        """Deterministic train/validation/test fit.

        - Stratified split on the binary review label (class balance kept).
        - Decision-cut selection happens on VALIDATION only.
        - Final regressor refits on train+validation; TEST is reported once.
        - Records seed, sizes, distributions, features, params, thresholds.
        """
        labeled = add_review_label(df)
        y = labeled["needs_review"].to_numpy()
        n = len(labeled)
        n_test = n - int(n * train_size) - int(n * val_size)

        sss_test = StratifiedShuffleSplit(n_splits=1, test_size=n_test, random_state=seed)
        trainval_idx, test_idx = next(sss_test.split(labeled, y))
        sss_val = StratifiedShuffleSplit(
            n_splits=1,
            test_size=int(n * val_size),
            random_state=seed + 1,
        )
        train_idx_rel, val_idx_rel = next(
            sss_val.split(np.zeros(len(trainval_idx)), y[trainval_idx])
        )
        train_idx, val_idx = trainval_idx[train_idx_rel], trainval_idx[val_idx_rel]

        def subset(idxs):
            sub = labeled.iloc[idxs]
            X = sub[self.FEATURE_COLS].copy()
            X["family_colocated"] = X["family_colocated"].astype(int)
            return X.to_numpy(), sub["latent_stress_index"].values, sub["needs_review"].to_numpy()

        X_train, y_train_reg, y_train = subset(train_idx)
        X_val, _, y_val = subset(val_idx)
        X_test, _, y_test = subset(test_idx)

        params = {"n_estimators": 75, "max_depth": 4, "learning_rate": 0.08, "random_state": seed}
        probe = GradientBoostingRegressor(**params)
        probe.fit(X_train, y_train_reg)

        # Cut selection on validation: sweep band cut 1..4, maximize F1.
        # Bands use predictor-output baselines from the TRAIN frame so the
        # cut decision sees the same calibration as production.
        train_frame = labeled.iloc[train_idx]
        probe_baselines = _pred_baselines(probe, train_frame)
        val_rows = labeled.iloc[val_idx]
        best_cut, best_f1 = OPERATIONAL_BAND_CUT, -1.0
        val_cut_metrics = {}
        for cut in (1, 2, 3, 4):
            preds = _band_predictions(probe, val_rows, probe_baselines, cut)
            f1 = f1_score(y_val, preds, zero_division=0)
            val_cut_metrics[cut] = {
                "precision": precision_score(y_val, preds, zero_division=0),
                "recall": recall_score(y_val, preds, zero_division=0),
                "f1": f1,
            }
            if f1 > best_f1:
                best_f1, best_cut = f1, cut

        # Operational cut stays at band>=3. Validation F1 peaks at a lower cut,
        # but that cut flags the large majority of personnel, which would
        # overwhelm welfare-officer capacity and erode trust through
        # unnecessary reviews (false-positive cost: workload + possible
        # stigma). band>=3 is a capacity/precision trade-off: fewer,
        # higher-confidence reviews. The price is lower recall, so missed
        # concerns must also be caught by other channels (self-referral,
        # commander signals, follow-up rhythm). Accuracy alone does not
        # govern this choice. Test metrics are reported at the operational
        # cut regardless of which cut wins on validation.
        decision_cut = OPERATIONAL_BAND_CUT
        decision_rationale = (
            f"Validation F1 peaks at band>={best_cut} (F1={best_f1:.3f}); "
            f"operational cut kept at band>={OPERATIONAL_BAND_CUT} as a "
            "capacity/precision trade-off (fewer, higher-confidence reviews; "
            "recall gap covered by self-referral and follow-up channels). "
            "See ModelCard threshold rationale."
        )

        # Final fit on train+validation.
        X_final = np.concatenate([X_train, X_val])
        y_final = np.concatenate([y_train_reg, labeled.iloc[val_idx]["latent_stress_index"].values])
        self.model = GradientBoostingRegressor(**params)
        self.model.fit(X_final, y_final)
        self.is_trained = True
        trainval_frame = labeled.iloc[np.concatenate([train_idx, val_idx])]
        self.pred_baselines = _pred_baselines(self.model, trainval_frame)

        def dist(idxs):
            yy = y[idxs]
            return {"n": int(len(idxs)), "positives": int(yy.sum()), "prevalence": float(yy.mean())}

        self.model_metadata.update({
            "seed": seed,
            "train": dist(train_idx),
            "validation": dist(val_idx),
            "test": dist(test_idx),
            "feature_list": list(self.FEATURE_COLS),
            "preprocessing": "family_colocated cast to int; no scaling (tree model)",
            "model_params": params,
            "label_definition": f"needs_review = latent_stress_index >= {REVIEW_LABEL_THRESHOLD}",
            "threshold_selection": "band-cut sweep on validation only",
            "validation_cut_metrics": val_cut_metrics,
            "operational_band_cut": decision_cut,
            "threshold_rationale": decision_rationale,
            "calibration_method": "unit-relative robust-z (median/MAD per context)",
            "calibration_baselines_source": (
                "median/MAD of the predictor's own raw-score output per context, "
                "estimated on the train+validation frame"
            ),
        })
        self._split_cache = {
            "test_idx": test_idx,
            "baselines": dict(self.pred_baselines),
            "decision_cut": decision_cut,
        }
        return dict(self.model_metadata)

    def evaluate(self, df: pd.DataFrame, band_cut: int | None = None) -> Dict:
        """Report test (or given-frame) metrics at the operational cut.

        Uses cached test indices from train_with_splits when available so the
        reported numbers are genuinely held-out.
        """
        if not self.is_trained:
            raise RuntimeError("Model must be trained before evaluation")
        labeled = add_review_label(df)
        cache = getattr(self, "_split_cache", None)
        if cache is not None:
            sub = labeled.iloc[cache["test_idx"]]
            baselines = cache["baselines"]
            scope = "held-out test split"
        else:
            sub = labeled
            baselines = _context_baselines(labeled)
            scope = "full frame (NOT held-out; for smoke checks only)"
        cut = band_cut if band_cut is not None else OPERATIONAL_BAND_CUT

        y_true = sub["needs_review"].to_numpy()
        scores, preds = [], []
        for _, row in sub.iterrows():
            rec = row.to_dict()
            raw = self.predict_raw_score(rec)
            band, _ = self.calibrate_band(raw, baselines.get(rec["force_type"], {}))
            scores.append(raw)
            preds.append(1 if band >= cut else 0)
        scores = np.array(scores)
        preds = np.array(preds)

        tn, fp, fn, tp = confusion_matrix(y_true, preds, labels=[0, 1]).ravel()
        try:
            roc_auc = float(roc_auc_score(y_true, scores))
        except ValueError:
            roc_auc = float("nan")
        try:
            pr_auc = float(average_precision_score(y_true, scores))
        except ValueError:
            pr_auc = float("nan")

        # Calibration: mean predicted vs observed positive rate per score bin.
        bins = np.linspace(0, 1, 6)
        calibration = []
        for lo, hi in zip(bins[:-1], bins[1:]):
            mask = (scores >= lo) & (scores < hi) if hi < 1.0 else (scores >= lo) & (scores <= hi)
            if mask.sum() == 0:
                continue
            calibration.append({
                "score_range": [round(float(lo), 2), round(float(hi), 2)],
                "n": int(mask.sum()),
                "mean_predicted": round(float(scores[mask].mean()), 3),
                "observed_positive_rate": round(float(y_true[mask].mean()), 3),
            })

        return {
            "scope": scope,
            "dataset": "synthetic validation data (NOT real-world validation)",
            "n": int(len(sub)),
            "band_cut": cut,
            "precision": float(precision_score(y_true, preds, zero_division=0)),
            "recall": float(recall_score(y_true, preds, zero_division=0)),
            "f1": float(f1_score(y_true, preds, zero_division=0)),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "roc_auc": roc_auc,
            "pr_auc": pr_auc,
            "calibration_by_score_bin": calibration,
            "welfare_reading": {
                "false_positive_means": "unnecessary welfare review / officer workload / possible stigma",
                "false_negative_means": "missed welfare concern / delayed support",
            },
        }


def _context_baselines(frame: pd.DataFrame) -> Dict[str, Dict]:
    baselines = {}
    for ctx in frame["force_type"].unique():
        subset = frame[frame["force_type"] == ctx]["latent_stress_index"]
        median = float(subset.median())
        mad = float(np.median(np.abs(subset - median)))
        baselines[ctx] = {"median": median, "mad": max(0.04, mad), "count": len(subset)}
    return baselines


def _pred_baselines(model, frame: pd.DataFrame) -> Dict[str, Dict]:
    """Per-context median/MAD of a fitted model's raw-score predictions."""
    X = frame[HRRiskEngine.FEATURE_COLS].copy()
    X["family_colocated"] = X["family_colocated"].astype(int)
    preds = np.clip(model.predict(X.to_numpy()), 0.0, 1.0)
    baselines = {}
    for ctx in frame["force_type"].unique():
        mask = (frame["force_type"] == ctx).to_numpy()
        subset = preds[mask]
        median = float(np.median(subset))
        mad = float(np.median(np.abs(subset - median)))
        baselines[ctx] = {"median": median, "mad": max(0.02, mad), "count": int(mask.sum())}
    return baselines


def _band_predictions(model, rows: pd.DataFrame, baselines: Dict, cut: int) -> np.ndarray:
    X = rows[["consecutive_days_deployed", "rest_ratio_28d", "leave_denial_ratio",
              "days_since_leave_return", "transfers_36m", "family_colocated",
              "night_duty_hours_28d", "duty_hour_variance_28d",
              "promotion_stagnation_yrs"]].copy()
    X["family_colocated"] = X["family_colocated"].astype(int)
    raws = np.clip(model.predict(X.to_numpy()), 0.0, 1.0)
    preds = []
    for raw, (_, row) in zip(raws, rows.iterrows()):
        base = baselines.get(row["force_type"], {"median": 0.50, "mad": 0.12})
        z = (raw - base["median"]) / (1.4826 * base["mad"])
        c1, c2, c3, c4 = HRRiskEngine.CALIBRATION_CUTS
        band = 0 if z < c1 else (1 if z < c2 else (2 if z < c3 else (3 if z < c4 else 4)))
        preds.append(1 if band >= cut else 0)
    return np.array(preds)


hr_risk_engine = HRRiskEngine()
