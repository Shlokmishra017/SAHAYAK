"""Phase 5 (6.1 + 6.3): backend + security hardening tests.

RBAC matrix, JWT expiry, invalid inputs, break-glass grant expiry,
audit verify/tamper/restore over HTTP, purge with linked interventions,
invalid IDs, rate-limit evidence.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

import unittest

import jwt
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import IdentityBroker, RealIdentityProfile, BreakGlassRequest
from app.main import app


def login(client, service_id, password="ServicePass@2026"):
    return client.post("/v1/auth/login", json={
        "full_name": "Test", "service_id": service_id, "password": password})


def reset_limits():
    from app.routes import (
        auth_api, device_api, welfare_api, command_api,
        identity_api, audit_api, hrms_api, alerts_api,
    )
    for mod in (auth_api, device_api, welfare_api, command_api,
                identity_api, audit_api, hrms_api, alerts_api):
        try:
            mod.limiter._storage.reset()
        except Exception:
            pass
    try:
        app.state.limiter._storage.reset()
    except Exception:
        pass


class TestPhase5Backend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()
        reset_limits()
        cls.wo = {"Authorization": f"Bearer {login(cls.client, 'WO-7742').json()['access_token']}"}
        cls.cmd = {"Authorization": f"Bearer {login(cls.client, 'CMD-1082').json()['access_token']}"}
        cls.z0 = {"Authorization": f"Bearer {login(cls.client, 'CAPF-849201').json()['access_token']}"}
        cls.aud = {"Authorization": f"Bearer {login(cls.client, 'AUD-9901').json()['access_token']}"}

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_01_rbac_matrix(self):
        # Personnel cannot touch welfare/command/audit/identity surfaces
        self.assertEqual(
            self.client.get("/v1/welfare/cases", headers=self.z0).status_code, 403)
        self.assertEqual(
            self.client.get("/v1/command/heatmap", headers=self.z0).status_code, 403)
        self.assertEqual(
            self.client.get("/v1/audit/logs", headers=self.z0).status_code, 403)
        self.assertEqual(
            self.client.get("/v1/identity/custodians-info", headers=self.z0).status_code, 403)
        # Commander cannot touch welfare queue or break-glass
        self.assertEqual(
            self.client.get("/v1/welfare/cases", headers=self.cmd).status_code, 403)
        # Welfare officer cannot view commander heatmap or audit log
        self.assertEqual(
            self.client.get("/v1/command/heatmap", headers=self.wo).status_code, 403)
        self.assertEqual(
            self.client.get("/v1/audit/logs", headers=self.wo).status_code, 403)
        # No token at all → 401
        self.assertEqual(self.client.get("/v1/welfare/cases").status_code, 401)
        # Garbage token → 401
        bad = {"Authorization": "Bearer garbage.token.here"}
        self.assertEqual(self.client.get("/v1/welfare/cases", headers=bad).status_code, 401)

    def test_02_expired_jwt_rejected(self):
        now = datetime.now(timezone.utc)
        payload = {
            "sub": "WO-7742", "role": "Z1_WELFARE_OFFICER", "name": "Expired",
            "iss": settings.jwt_issuer, "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        r = self.client.get("/v1/welfare/cases",
                            headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 401)

    def test_03_invalid_case_ids_404(self):
        self.assertEqual(
            self.client.get("/v1/welfare/cases/CASE-NOPE-123", headers=self.wo).status_code, 404)
        r = self.client.post("/v1/welfare/cases/CASE-NOPE-123/interventions",
                             headers=self.wo, json={
                                 "case_id": "CASE-NOPE-123", "kind": "routine_contact",
                                 "officer_id": "WO-7742", "notes_sanitized": "x"})
        self.assertEqual(r.status_code, 404)
        r = self.client.post("/v1/alerts/ALERT-NOPE/ack", headers=self.wo)
        self.assertEqual(r.status_code, 404)

    def test_04_invalid_inputs_rejected(self):
        esc = self.client.post("/v1/device/escalations", headers=self.z0, json={
            "pseudonym_id": "phase5-input-pseudo", "tier": "elevated",
            "origin": "device_fusion", "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": "2026-09-22T00:00:00Z"}).json()
        case_id = esc["case_id"]
        # Bad outcome score + unknown outcome + bad status value
        int_id = self.client.post(
            f"/v1/welfare/cases/{case_id}/interventions", headers=self.wo, json={
                "case_id": case_id, "kind": "routine_contact", "officer_id": "WO-7742",
                "notes_sanitized": "n"}).json()["intervention"]["intervention_id"]
        bad_score = self.client.post(
            f"/v1/welfare/cases/{case_id}/interventions/{int_id}/outcome",
            headers=self.wo, json={"outcome": "improved", "outcome_score": 9})
        self.assertEqual(bad_score.status_code, 400)
        bad_status = self.client.patch(f"/v1/welfare/cases/{case_id}/status",
                                       headers=self.wo, json={"status": "vibing"})
        self.assertEqual(bad_status.status_code, 409)
        # Malformed CSV upload rejected, oversized rejected
        files = {"file": ("bad.txt", b"not,a,valid\xff\xfe", "text/csv")}
        r = self.client.post("/v1/hrms/import", headers=self.wo, files=files)
        self.assertIn(r.status_code, (400, 413, 422))

    def test_05_break_glass_grant_expiry(self):
        IdentityBroker.register_personnel(RealIdentityProfile(
            pseudonym_id="phase5-expiry-pseudo", service_number="CAPF-500001",
            full_name="Expiry Test", rank="Constable", unit="CRPF 144 Bn",
            blood_group="O+", emergency_contact_phone="+91 9000000002",
            emergency_contact_name="Kin Two", base_location="Sector HQ"))
        req = BreakGlassRequest(
            case_id="CASE-EXP", pseudonym_id="phase5-expiry-pseudo",
            custodian_1_role="welfare_officer", custodian_1_id="WO_7742",
            custodian_1_pin="9481", custodian_2_role="medical_officer",
            custodian_2_id="MO_3109", custodian_2_pin="6205",
            justification="Emergency life-safety review required now!!")
        ok, _, _ = IdentityBroker.break_glass_deanonymize(req, requester_sub="WO-7742")
        self.assertTrue(ok)
        from app.core.database import BreakGlassRequestRecord, SessionLocal
        with SessionLocal() as db:
            row = db.query(BreakGlassRequestRecord).filter(
                BreakGlassRequestRecord.pseudonym_id == "phase5-expiry-pseudo").order_by(
                BreakGlassRequestRecord.created_at.desc()).first()
            self.assertIsNotNone(row)
            self.assertIsNotNone(IdentityBroker.get_active_grant(row.request_id))
            # Backdate expiry → grant resolves to None and row marked expired
            row.expires_at = "2000-01-01T00:00:00+00:00"
            db.commit()
            request_id = row.request_id
        self.assertIsNone(IdentityBroker.get_active_grant(request_id))
        with SessionLocal() as db:
            self.assertEqual(db.get(BreakGlassRequestRecord, request_id).status, "expired")

    def test_06_one_user_cannot_satisfy_both_custodians(self):
        r = self.client.post("/v1/identity/break-glass", headers=self.wo, json={
            "case_id": "CASE-X", "pseudonym_id": "phase5-expiry-pseudo",
            "custodian_1_role": "welfare_officer", "custodian_1_id": "WO_7742",
            "custodian_1_pin": "9481", "custodian_2_role": "welfare_officer",
            "custodian_2_id": "WO_7742", "custodian_2_pin": "9481",
            "justification": "Emergency life-safety review required now!!"})
        self.assertEqual(r.status_code, 403)

    def test_07_audit_verify_tamper_restore_over_http(self):
        reset_limits()
        v0 = self.client.get("/v1/audit/verify", headers=self.aud).json()
        self.assertTrue(v0["is_valid"])
        t = self.client.post("/v1/audit/tamper-simulation?block_seq=1", headers=self.aud)
        self.assertEqual(t.status_code, 200)
        self.assertFalse(t.json()["verification_result"]["is_valid"])
        v1 = self.client.get("/v1/audit/verify", headers=self.aud).json()
        self.assertFalse(v1["is_valid"])
        # Tamper simulation is auditor-only: welfare officer gets 403
        denied = self.client.post("/v1/audit/tamper-simulation?block_seq=1", headers=self.wo)
        self.assertEqual(denied.status_code, 403)
        r = self.client.post("/v1/audit/restore-chain", headers=self.aud)
        self.assertEqual(r.status_code, 200)
        v2 = self.client.get("/v1/audit/verify", headers=self.aud).json()
        self.assertTrue(v2["is_valid"])

    def test_08_purge_removes_interventions_and_keeps_audit(self):
        pseudo = "phase5-purge-full"
        esc = self.client.post("/v1/device/escalations", headers=self.z0, json={
            "pseudonym_id": pseudo, "tier": "elevated", "origin": "device_fusion",
            "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": "2026-09-22T00:00:00Z"}).json()
        self.client.post(f"/v1/welfare/cases/{esc['case_id']}/interventions",
                         headers=self.wo, json={
                             "case_id": esc["case_id"], "kind": "peer_buddy_nudge",
                             "officer_id": "WO-7742", "notes_sanitized": "buddy assigned"})
        before = self.client.get("/v1/audit/verify", headers=self.aud).json()["total_blocks_checked"]
        r = self.client.post("/v1/device/erasure", headers=self.z0, json={
            "pseudonym_id": pseudo, "confirmation_token": f"CONFIRM-{pseudo}"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["purged_cases"], 1)
        self.assertEqual(body["purged_interventions"], 1)
        # Case gone, audit chain still verifiable with one more block
        self.assertEqual(
            self.client.get(f"/v1/welfare/cases/{esc['case_id']}", headers=self.wo).status_code, 404)
        after = self.client.get("/v1/audit/verify", headers=self.aud).json()
        self.assertTrue(after["is_valid"])
        self.assertGreater(after["total_blocks_checked"], before)

    def test_09_rate_limit_evidence(self):
        reset_limits()
        statuses = set()
        # Break-glass allows 5/minute: 8 rapid failures must include a 429
        for _ in range(8):
            r = self.client.post("/v1/identity/break-glass", headers=self.wo, json={
                "case_id": "CASE-RL", "pseudonym_id": "phase5-expiry-pseudo",
                "custodian_1_role": "welfare_officer", "custodian_1_id": "WO_7742",
                "custodian_1_pin": "WRONG", "custodian_2_role": "medical_officer",
                "custodian_2_id": "MO_3109", "custodian_2_pin": "6205",
                "justification": "Emergency life-safety review required now!!"})
            statuses.add(r.status_code)
        self.assertIn(429, statuses)


if __name__ == "__main__":
    unittest.main()
