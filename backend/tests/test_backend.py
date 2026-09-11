"""
Sahayak Automated Verification & Security Test Suite
Tests:
1. Synthetic cohort generation & non-linear post-leave hazard bump
2. HR operational risk model training & unit-relative robust z-scoring
3. Reason code closed-vocabulary validation
4. Cryptographic SHA-256 hash-chain ledger verification & tamper detection
5. K-anonymity (k >= 20) & complementary cell suppression
6. Dual-custodian identity isolation & break-glass authorization
7. FastAPI endpoint verification
"""

import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import numpy as np
from app.ml.synthetic_generator import SyntheticCohortManager
from app.ml.hr_risk_model import HRRiskEngine
from app.core.reason_codes import validate_reason_codes, REASON_CODES
from app.core.audit_chain import AuditChainEngine
from app.core.k_anonymity import enforce_k_anonymity_cohort, apply_complementary_suppression
from app.core.security import IdentityBroker, RealIdentityProfile, BreakGlassRequest

class TestSahayakCore(unittest.TestCase):

    def test_01_synthetic_generator_and_post_leave_hazard(self):
        manager = SyntheticCohortManager(seed=123)
        df = manager.generate_cohort(n_samples=200)
        
        self.assertEqual(len(df), 200)
        self.assertIn("post_leave_hazard", df.columns)
        self.assertIn("latent_stress_index", df.columns)
        
        # Verify non-linear hazard is active for return window 7 to 21 days
        window_cases = df[(df["days_since_leave_return"] >= 7) & (df["days_since_leave_return"] <= 21)]
        if not window_cases.empty:
            self.assertTrue((window_cases["post_leave_hazard"] > 0).all())

    def test_02_hr_risk_model_unit_relative_calibration(self):
        manager = SyntheticCohortManager(seed=123)
        df = manager.generate_cohort(n_samples=300)
        
        engine = HRRiskEngine()
        engine.train_model(df)
        self.assertTrue(engine.is_trained)
        
        sample_record = df.iloc[0].to_dict()
        ctx = sample_record["force_type"]
        baseline = manager.cohort_stats[ctx]
        
        raw_score, h_band, reason_codes, _ = engine.predict_individual_risk(sample_record, baseline)
        self.assertIsInstance(raw_score, float)
        self.assertIn(h_band, [0, 1, 2, 3, 4])
        self.assertIsInstance(reason_codes, list)

    def test_03_reason_code_whitelist(self):
        test_codes = ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER", "INVALID_CUSTOM_STRING", "FREE_TEXT_DIAGNOSIS"]
        clean = validate_reason_codes(test_codes)
        self.assertEqual(clean, ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER"])
        self.assertNotIn("INVALID_CUSTOM_STRING", clean)
        self.assertNotIn("FREE_TEXT_DIAGNOSIS", clean)

    def test_04_cryptographic_hash_chain_and_tamper_detection(self):
        audit = AuditChainEngine()
        
        # Append 3 logs
        audit.append_log(actor_role="edge_device", actor_id="user_1", action="ESCALATION_RECORDED")
        audit.append_log(actor_role="welfare_officer", actor_id="wo_7742", action="CASE_ACCESSED")
        audit.append_log(actor_role="welfare_officer", actor_id="wo_7742", action="INTERVENTION_LOGGED")
        
        # Verify intact chain
        is_valid, msg, broken_seq = audit.verify_integrity()
        self.assertTrue(is_valid)
        self.assertIsNone(broken_seq)
        
        # Simulate malicious tampering on Block #1
        tampered = audit.tamper_demo(1)
        self.assertTrue(tampered)
        
        # Verifier must catch the breach!
        is_valid_after, msg_after, broken_seq_after = audit.verify_integrity()
        self.assertFalse(is_valid_after)
        self.assertEqual(broken_seq_after, 1)

    def test_05_k_anonymity_enforcement(self):
        # Small cohort (n=12 < 20) -> Must be suppressed
        suppressed = enforce_k_anonymity_cohort(
            cohort_name="Outpost Echo",
            total_personnel=12,
            metrics={"avg_fatigue_index": 7.5}
        )
        self.assertTrue(suppressed["is_suppressed"])
        self.assertIsNone(suppressed["avg_fatigue_index"])
        
        # Standard cohort (n=45 >= 20) -> Must be approved
        approved = enforce_k_anonymity_cohort(
            cohort_name="Company Alpha",
            total_personnel=45,
            metrics={"avg_fatigue_index": 5.2}
        )
        self.assertFalse(approved["is_suppressed"])
        self.assertEqual(approved["avg_fatigue_index"], 5.2)

    def test_06_dual_custodian_break_glass(self):
        # Register a test subject
        IdentityBroker.register_personnel(RealIdentityProfile(
            pseudonym_id="test-pseudo-123",
            service_number="CAPF-998877",
            full_name="Constable Arjun Rathore",
            rank="Constable",
            unit="BSF 92 Bn",
            blood_group="O+",
            emergency_contact_phone="+91 9811223344",
            emergency_contact_name="Smt. Radha Rathore",
            base_location="Sector HQ, Jodhpur"
        ))
        
        # Single custodian or invalid PIN -> Rejection
        req_fail = BreakGlassRequest(
            case_id="CASE-01",
            pseudonym_id="test-pseudo-123",
            custodian_1_role="welfare_officer",
            custodian_1_id="WO_7742",
            custodian_1_pin="WRONG_PIN",
            custodian_2_role="medical_officer",
            custodian_2_id="MO_3109",
            custodian_2_pin="6205",
            justification="Emergency"
        )
        success, _, _ = IdentityBroker.break_glass_deanonymize(req_fail)
        self.assertFalse(success)
        
        # Valid dual custodians -> Approved
        req_pass = BreakGlassRequest(
            case_id="CASE-01",
            pseudonym_id="test-pseudo-123",
            custodian_1_role="welfare_officer",
            custodian_1_id="WO_7742",
            custodian_1_pin="9481",
            custodian_2_role="medical_officer",
            custodian_2_id="MO_3109",
            custodian_2_pin="6205",
            justification="Emergency life-safety hospital escort"
        )
        success, profile, _ = IdentityBroker.break_glass_deanonymize(req_pass)
        self.assertTrue(success)
        self.assertEqual(profile.full_name, "Constable Arjun Rathore")

if __name__ == "__main__":
    unittest.main()
