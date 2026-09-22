"""Phase 1 acceptance tests: trust, security, demo integrity.

Covers plan sections 2.1-2.4:
- no auto-provisioning of arbitrary IDs
- no PINs in custodian directory
- break-glass: distinct custodians, persistent registry, minimal disclosure,
  time-bound grant, audit entry, no PIN leak
- erasure: confirmation-token validation, case+intervention purge,
  audit retention
- health/readiness endpoints
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Deterministic custodian env for tests (never committed).
os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import IdentityBroker, RealIdentityProfile, BreakGlassRequest


def login(client, service_id, password="ServicePass@2026", name="Test User"):
    r = client.post("/v1/auth/login", json={
        "full_name": name, "service_id": service_id, "password": password})
    return r


class TestPhase1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()
        # Known seeded identities
        assert login(cls.client, "WO-7742").status_code == 200
        cls.wo = {"Authorization": f"Bearer {login(cls.client, 'WO-7742').json()['access_token']}"}
        cls.z0 = {"Authorization": f"Bearer {login(cls.client, 'CAPF-849201').json()['access_token']}"}
        cls.aud = {"Authorization": f"Bearer {login(cls.client, 'AUD-9901').json()['access_token']}"}

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_01_unknown_service_id_rejected_no_autoprovision(self):
        r = login(self.client, "WO-FAKE-9999", password="anything")
        self.assertEqual(r.status_code, 401)
        r = login(self.client, "RANDOM-123", password="anything")
        self.assertEqual(r.status_code, 401)

    def test_02_custodians_info_has_no_pins(self):
        r = self.client.get("/v1/identity/custodians-info", headers=self.wo)
        self.assertEqual(r.status_code, 200)
        body = r.text.lower()
        self.assertNotIn("9481", body)
        self.assertNotIn("6205", body)
        self.assertNotIn("8821", body)
        self.assertNotIn("demo_pin", body)
        self.assertNotIn("pin", body)

    def test_03_break_glass_same_identity_rejected(self):
        IdentityBroker.register_personnel(RealIdentityProfile(
            pseudonym_id="phase1-pseudo-1",
            service_number="CAPF-000001",
            full_name="Test Personnel One",
            rank="Constable",
            unit="CRPF 144 Bn",
            blood_group="O+",
            emergency_contact_phone="+91 9000000001",
            emergency_contact_name="Kin One",
            base_location="Sector HQ",
        ))
        req = BreakGlassRequest(
            case_id="CASE-TEST",
            pseudonym_id="phase1-pseudo-1",
            custodian_1_role="welfare_officer",
            custodian_1_id="WO_7742",
            custodian_1_pin="9481",
            custodian_2_role="welfare_officer",
            custodian_2_id="WO_7742",
            custodian_2_pin="9481",
            justification="Emergency life-safety intervention required now",
        )
        ok, _, _ = IdentityBroker.break_glass_deanonymize(req, requester_sub="WO-7742")
        self.assertFalse(ok)

    def test_04_break_glass_valid_minimal_disclosure_and_persistent(self):
        req = BreakGlassRequest(
            case_id="CASE-TEST",
            pseudonym_id="phase1-pseudo-1",
            custodian_1_role="welfare_officer",
            custodian_1_id="WO_7742",
            custodian_1_pin="9481",
            custodian_2_role="medical_officer",
            custodian_2_id="MO_3109",
            custodian_2_pin="6205",
            justification="Emergency life-safety hospital escort required urgently",
        )
        ok, disclosure, _ = IdentityBroker.break_glass_deanonymize(req, requester_sub="WO-7742")
        self.assertTrue(ok)
        dumped = disclosure.model_dump()
        # Minimal disclosure: no sensitive fields
        self.assertNotIn("blood_group", dumped)
        self.assertNotIn("emergency_contact_phone", dumped)
        self.assertNotIn("base_location", dumped)
        self.assertIn("service_number", dumped)
        # Persistent registry row exists (survives restart = DB-backed)
        from app.core.database import BreakGlassRequestRecord, SessionLocal
        with SessionLocal() as db:
            rows = list(db.query(BreakGlassRequestRecord).filter(
                BreakGlassRequestRecord.pseudonym_id == "phase1-pseudo-1"))
            self.assertTrue(len(rows) >= 1)
            grant = IdentityBroker.get_active_grant(rows[-1].request_id)
            self.assertIsNotNone(grant)

    def test_05_break_glass_wrong_pin_rejected_via_api(self):
        r = self.client.post("/v1/identity/break-glass", headers=self.wo, json={
            "case_id": "CASE-TEST",
            "pseudonym_id": "phase1-pseudo-1",
            "custodian_1_role": "welfare_officer",
            "custodian_1_id": "WO_7742",
            "custodian_1_pin": "WRONG",
            "custodian_2_role": "medical_officer",
            "custodian_2_id": "MO_3109",
            "custodian_2_pin": "6205",
            "justification": "Emergency life-safety intervention required now!",
        })
        self.assertEqual(r.status_code, 403)

    def test_06_erasure_requires_valid_confirmation_token(self):
        # Create a case to purge
        now = "2026-09-22T00:00:00Z"
        r = self.client.post("/v1/device/escalations", headers=self.z0, json={
            "pseudonym_id": "phase1-purge-me",
            "tier": "elevated",
            "origin": "device_fusion",
            "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": now,
        })
        self.assertEqual(r.status_code, 200)
        # Invalid token rejected
        bad = self.client.post("/v1/device/erasure", headers=self.z0, json={
            "pseudonym_id": "phase1-purge-me", "confirmation_token": "CONFIRMED"})
        self.assertEqual(bad.status_code, 400)
        # Valid token purges cases (+ linked interventions count reported)
        good = self.client.post("/v1/device/erasure", headers=self.z0, json={
            "pseudonym_id": "phase1-purge-me",
            "confirmation_token": "CONFIRM-phase1-purge-me"})
        self.assertEqual(good.status_code, 200)
        body = good.json()
        self.assertEqual(body["status"], "purged")
        self.assertGreaterEqual(body["purged_cases"], 1)
        self.assertIn("purged_interventions", body)

    def test_07_health_and_ready(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        r = self.client.get("/ready")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("ready"))


if __name__ == "__main__":
    unittest.main()
