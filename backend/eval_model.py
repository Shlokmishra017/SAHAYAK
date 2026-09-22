"""Reproducible model evaluation (Phase 2, plan 3.5).

Generates a synthetic cohort with a documented seed, fits the risk engine
with a deterministic train/validation/test split, and reports precision,
recall, F1, confusion matrix, FP/FN (with welfare reading), ROC-AUC, PR-AUC,
calibration bins, and metrics at the operational decision cut.

All metrics are explicitly labeled synthetic-data evaluation, never
real-world validation.

Usage (from backend/):
    python eval_model.py [--seed 42] [--n 1200] [--json-out artifacts/eval_results.json]
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test/dev custodian env so cohort seeding (identity registry) works standalone.
os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

from app.ml.synthetic_generator import SyntheticCohortManager, add_review_label
from app.ml.hr_risk_model import HRRiskEngine, MODEL_VERSION, OPERATIONAL_BAND_CUT


def main() -> dict:
    parser = argparse.ArgumentParser(description="Evaluate Sahayak HR risk model on synthetic data")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--n", type=int, default=1200)
    parser.add_argument("--json-out", type=str, default=None)
    args = parser.parse_args()

    manager = SyntheticCohortManager(seed=args.seed)
    df = manager.generate_cohort(n_samples=args.n)
    labeled = add_review_label(df)

    engine = HRRiskEngine()
    split_meta = engine.train_with_splits(df, seed=args.seed)
    report = engine.evaluate(df)

    output = {
        "model_version": MODEL_VERSION,
        "data_seed": args.seed,
        "label_definition": split_meta["label_definition"],
        "splits": {
            "train": split_meta["train"],
            "validation": split_meta["validation"],
            "test": split_meta["test"],
        },
        "threshold_selection": split_meta["threshold_selection"],
        "validation_cut_metrics": split_meta["validation_cut_metrics"],
        "operational_band_cut": OPERATIONAL_BAND_CUT,
        "test_metrics": report,
    }

    print("=" * 64)
    print("Sahayak HR risk model — Evaluation on SYNTHETIC validation data")
    print("(not real-world validation; see docs/ModelCard.md)")
    print("=" * 64)
    print(f"model: {MODEL_VERSION} | data seed: {args.seed} | n: {len(df)}")
    print(f"label: {split_meta['label_definition']}")
    for name in ("train", "validation", "test"):
        s = split_meta[name]
        print(f"  {name:10s} n={s['n']:5d} positives={s['positives']:4d} "
              f"prevalence={s['prevalence']:.3f}")
    print(f"\nthreshold selection (validation only): {split_meta['threshold_selection']}")
    for cut, m in sorted(split_meta["validation_cut_metrics"].items()):
        print(f"  band>={cut}: P={m['precision']:.3f} R={m['recall']:.3f} F1={m['f1']:.3f}")
    print(f"\nheld-out TEST @ operational cut band>={report['band_cut']}:")
    print(f"  precision={report['precision']:.3f} recall={report['recall']:.3f} "
          f"F1={report['f1']:.3f}")
    cm = report["confusion_matrix"]
    print(f"  confusion: TN={cm['tn']} FP={cm['fp']} FN={cm['fn']} TP={cm['tp']}")
    print(f"  ROC-AUC={report['roc_auc']:.3f} PR-AUC={report['pr_auc']:.3f}")
    print("  calibration (score bin -> observed positive rate):")
    for b in report["calibration_by_score_bin"]:
        print(f"    {b['score_range']}: n={b['n']} pred={b['mean_predicted']} "
              f"obs={b['observed_positive_rate']}")
    print("\n  welfare reading:")
    print(f"    false positive ({report['false_positives']}): "
          f"{report['welfare_reading']['false_positive_means']}")
    print(f"    false negative ({report['false_negatives']}): "
          f"{report['welfare_reading']['false_negative_means']}")

    if args.json_out:
        os.makedirs(os.path.dirname(args.json_out) or ".", exist_ok=True)
        with open(args.json_out, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\nWrote {args.json_out}")
    return output


if __name__ == "__main__":
    main()
