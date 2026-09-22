"""Phase 2 acceptance tests: defensible risk engine.

Covers plan sections 3.1-3.8 (honest naming, staged pipeline, synthetic-data
redesign, train/val/test discipline, reported metrics, trajectory,
insufficient-data confidence).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.synthetic_generator import SyntheticCohortManager, add_review_label
from app.ml.hr_risk_model import (
    HRRiskEngine,
    MODEL_VERSION,
    OPERATIONAL_BAND_CUT,
)
from app.ml.trajectory import build_trajectory


class FakeCase:
    def __init__(self, case_id, opened_at, tier, status="open"):
        self.case_id = case_id
        self.opened_at = opened_at
        self.tier = tier
        self.status = status


class TestPhase2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        manager = SyntheticCohortManager(seed=7)
        cls.df = manager.generate_cohort(n_samples=600)
        cls.engine = HRRiskEngine()
        cls.meta = cls.engine.train_with_splits(cls.df, seed=7)

    def test_01_honest_model_version(self):
        self.assertNotIn("lgbm", MODEL_VERSION.lower())
        self.assertNotIn("int8", MODEL_VERSION.lower())
        self.assertIn("synthetic", MODEL_VERSION.lower())

    def test_02_deterministic_splits_recorded(self):
        for name in ("train", "validation", "test"):
            self.assertIn("n", self.meta[name])
            self.assertIn("prevalence", self.meta[name])
        total = sum(self.meta[n]["n"] for n in ("train", "validation", "test"))
        self.assertEqual(total, 600)
        # Minority-class prevalence preserved
        self.assertLess(self.meta["test"]["prevalence"], 0.5)
        self.assertGreater(self.meta["test"]["prevalence"], 0.05)
        self.assertEqual(self.meta["seed"], 7)
        self.assertEqual(len(self.meta["feature_list"]), 9)
        # Threshold chosen on validation, never test
        self.assertIn("validation_cut_metrics", self.meta)
        self.assertEqual(self.meta["operational_band_cut"], OPERATIONAL_BAND_CUT)

    def test_03_test_metrics_reported(self):
        report = self.engine.evaluate(self.df)
        self.assertEqual(report["scope"], "held-out test split")
        self.assertIn("synthetic", report["dataset"].lower())
        for key in ("precision", "recall", "f1", "roc_auc", "pr_auc"):
            self.assertGreaterEqual(report[key], 0.0)
            self.assertLessEqual(report[key], 1.0)
        cm = report["confusion_matrix"]
        self.assertEqual(cm["fp"] + cm["fn"] + cm["tp"] + cm["tn"], report["n"])
        self.assertIn("false_positive_means", report["welfare_reading"])

    def test_04_reason_codes_are_rules_not_model_explanations(self):
        rec = self.df.iloc[0].to_dict()
        rec["consecutive_days_deployed"] = 120  # force the rule
        codes, _ = self.engine.generate_reason_codes(rec)
        self.assertIn("RC_SUSTAINED_DEPLOYMENT", codes)
        rec["consecutive_days_deployed"] = 5  # rule off regardless of model
        codes, _ = self.engine.generate_reason_codes(rec)
        self.assertNotIn("RC_SUSTAINED_DEPLOYMENT", codes)

    def test_05_unknown_personnel_returns_none(self):
        manager = SyntheticCohortManager(seed=7)
        manager.generate_cohort(n_samples=50)
        self.assertIsNone(manager.get_personnel_by_pseudonym("no-such-id"))

    def test_06_insufficient_history_confidence(self):
        rec = self.df.iloc[0].to_dict()
        confidence, note = self.engine.assess_confidence(
            rec, {"median": 0.5, "mad": 0.1, "count": 5})
        self.assertEqual(confidence, "insufficient_history")
        self.assertIsNotNone(note)
        # Unknown unit context falls back to the sparse baseline, so the
        # resolved confidence is insufficient_history rather than a firm band.
        rec_unknown = dict(rec, force_type="unknown_context")
        out = self.engine.predict_with_confidence(
            rec_unknown, {"median": 0.5, "mad": 0.1, "count": 5})
        self.assertEqual(out["confidence"], "insufficient_history")

    def test_07_trajectory_states(self):
        single = build_trajectory([FakeCase("C1", "2026-01-01", "elevated")])
        self.assertEqual(single["trend"], "insufficient_history")
        rising = build_trajectory([
            FakeCase("C1", "2026-01-01", "emerging"),
            FakeCase("C2", "2026-02-01", "critical"),
        ])
        self.assertEqual(rising["trend"], "rising")
        falling = build_trajectory([
            FakeCase("C1", "2026-01-01", "critical"),
            FakeCase("C2", "2026-02-01", "emerging"),
        ])
        self.assertEqual(falling["trend"], "falling")
        stable = build_trajectory([
            FakeCase("C1", "2026-01-01", "elevated"),
            FakeCase("C2", "2026-02-01", "elevated"),
        ])
        self.assertEqual(stable["trend"], "stable")

    def test_08_no_shap_int8_biometric_leak_in_pipeline(self):
        blob = " ".join([
            MODEL_VERSION,
            str(self.engine.generate_reason_codes(self.df.iloc[0].to_dict())),
            str(self.engine.predict_with_confidence(
                self.df.iloc[0].to_dict(),
                {"median": 0.5, "mad": 0.1, "count": 100}).keys()),
        ]).lower()
        for banned in ("shap", "int8", "neural", "biometric", "lgbm"):
            self.assertNotIn(banned, blob)


class TestPhase2API(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()
        r = cls.client.post("/v1/auth/login", json={
            "full_name": "Test", "service_id": "CAPF-849201",
            "password": "ServicePass@2026"})
        assert r.status_code == 200, r.text
        cls.z0 = {"Authorization": f"Bearer {r.json()['access_token']}"}
        r = cls.client.post("/v1/auth/login", json={
            "full_name": "Test", "service_id": "WO-7742",
            "password": "ServicePass@2026"})
        assert r.status_code == 200, r.text
        cls.wo = {"Authorization": f"Bearer {r.json()['access_token']}"}

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_09_risk_band_has_confidence_and_trend(self):
        from app.ml.synthetic_generator import cohort_manager
        pseudo = cohort_manager.personnel_df.iloc[0]["pseudonym_id"]
        r = self.client.get(f"/v1/device/risk-band/{pseudo}", headers=self.z0)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn(body["confidence"], ("standard", "insufficient_history"))
        self.assertIn("trend", body)
        self.assertNotIn("lgbm", body["model_version"])

    def test_10_case_detail_has_trajectory(self):
        cases = self.client.get("/v1/welfare/cases", headers=self.wo).json()
        self.assertTrue(len(cases) > 0)
        r = self.client.get(f"/v1/welfare/cases/{cases[0]['case_id']}", headers=self.wo)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("trajectory", r.json())
        self.assertIn(r.json()["trajectory"]["trend"],
                      ("rising", "falling", "stable", "insufficient_history"))


if __name__ == "__main__":
    unittest.main()
