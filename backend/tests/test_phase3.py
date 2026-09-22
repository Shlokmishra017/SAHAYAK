"""Phase 3 acceptance tests: real PS workflow.

Covers plan sections 4.1 (HRMS CSV), 4.4 (intervention outcome loop),
4.6 (commander aggregates), 4.7 (alert channel).
"""

import io
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


def login(client, service_id, password="ServicePass@2026"):
    return client.post("/v1/auth/login", json={
        "full_name": "Test", "service_id": service_id, "password": password})


SAMPLE_ROWS = (
    "service_number,full_name,consecutive_days_deployed,rest_ratio_28d,"
    "leave_denial_ratio,days_since_leave_return,transfers_36m,family_colocated,"
    "night_duty_hours_28d,duty_hour_variance_28d,promotion_stagnation_yrs,"
    "rank,unit,record_date\n"
    "HRMS-T01,High Deploy Test,120,0.25,0.65,10,3,no,130,24,7.5,Constable,CRPF 144 Bn (CI Ops),2026-09-01\n"
    "HRMS-T02,Steady Test,20,0.80,0.05,180,0,yes,40,10,2.0,Head Constable,CISF Plant Security Unit,2026-09-01\n"
    "HRMS-T03,Bad Row Test,45,1.80,0.30,30,1,yes,60,12,3.0,Constable,BSF 92 Bn,2026-09-01\n"
    "HRMS-T01,High Deploy Test,120,0.25,0.65,10,3,no,130,24,7.5,Constable,CRPF 144 Bn (CI Ops),2026-09-01\n"
)


class TestPhase3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()
        # Isolate from rate-limit counters consumed by other suites in the
        # same process. Every router module owns its own Limiter instance
        # with independent in-memory storage, so reset them all.
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
        cls.wo = {"Authorization": f"Bearer {login(cls.client, 'WO-7742').json()['access_token']}"}
        cls.cmd = {"Authorization": f"Bearer {login(cls.client, 'CMD-1082').json()['access_token']}"}
        cls.z0 = {"Authorization": f"Bearer {login(cls.client, 'CAPF-849201').json()['access_token']}"}

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_01_hrms_template_and_sample(self):
        r = self.client.get("/v1/hrms/template", headers=self.wo)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("service_number", body["required_columns"])
        self.assertIn("record_date", body["optional_columns"])
        r = self.client.get("/v1/hrms/sample-csv", headers=self.wo)
        self.assertEqual(r.status_code, 200)
        self.assertIn("service_number", r.text)

    def test_02_hrms_import_summary_and_row_report(self):
        files = {"file": ("test.csv", io.BytesIO(SAMPLE_ROWS.encode()), "text/csv")}
        r = self.client.post("/v1/hrms/import", headers=self.wo, files=files)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["rows_total"], 4)
        # 1 invalid + 1 duplicate rejected
        self.assertEqual(body["rows_rejected"], 2)
        self.assertTrue(any("duplicate" in e["error"] for e in body["errors"]))
        self.assertTrue(any("rest_ratio" in e["error"] for e in body["errors"]))
        # High-deploy row creates/updates a case; steady row is below threshold
        self.assertGreaterEqual(body["rows_new"] + body["rows_updated"], 1)
        self.assertGreaterEqual(body["rows_below_threshold"], 1)

    def test_03_hrms_reimport_updates_not_duplicates(self):
        files = {"file": ("test.csv", io.BytesIO(SAMPLE_ROWS.encode()), "text/csv")}
        first = self.client.post("/v1/hrms/import", headers=self.wo, files=files).json()
        second = self.client.post("/v1/hrms/import", headers=self.wo, files=files).json()
        # Same file again: previously-new rows now update (no case duplication)
        self.assertGreaterEqual(second["rows_updated"], first["rows_new"] - 1)
        self.assertEqual(second["rows_rejected"], 2)

    def test_04_hrms_missing_column_rejected(self):
        files = {"file": ("bad.csv", io.BytesIO(b"service_number,full_name\nA,B\n"), "text/csv")}
        r = self.client.post("/v1/hrms/import", headers=self.wo, files=files)
        self.assertEqual(r.status_code, 400)

    def test_05_intervention_outcome_loop(self):
        # Fresh case via escalation so the test never depends on shared DB state
        esc = self.client.post("/v1/device/escalations", headers=self.z0, json={
            "pseudonym_id": "phase3-outcome-pseudo",
            "tier": "elevated",
            "origin": "device_fusion",
            "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": "2026-09-22T00:00:00Z"})
        self.assertEqual(esc.status_code, 200, esc.text)
        case_id = esc.json()["case_id"]
        # Log intervention with follow-up
        r = self.client.post(f"/v1/welfare/cases/{case_id}/interventions", headers=self.wo, json={
            "case_id": case_id, "kind": "welfare_counseling", "officer_id": "WO-7742",
            "notes_sanitized": "Rest rotation agreed",
            "target_concern": "sleep_fatigue", "follow_up_date": "2026-10-01"})
        self.assertEqual(r.status_code, 200, r.text)
        int_id = r.json()["intervention"]["intervention_id"]
        # Invalid outcome rejected
        bad = self.client.post(
            f"/v1/welfare/cases/{case_id}/interventions/{int_id}/outcome",
            headers=self.wo, json={"outcome": "cured"})
        self.assertEqual(bad.status_code, 400)
        # Valid outcome recorded; needs_follow_up moves case to follow_up_due
        good = self.client.post(
            f"/v1/welfare/cases/{case_id}/interventions/{int_id}/outcome",
            headers=self.wo, json={"outcome": "needs_follow_up", "outcome_score": 2})
        self.assertEqual(good.status_code, 200, good.text)
        self.assertEqual(good.json()["case_status"], "follow_up_due")
        # Illegal transition (follow_up_due -> open) rejected
        illegal = self.client.patch(f"/v1/welfare/cases/{case_id}/status",
                                    headers=self.wo, json={"status": "open"})
        self.assertEqual(illegal.status_code, 409)
        # Legal transition works
        legal = self.client.patch(f"/v1/welfare/cases/{case_id}/status",
                                  headers=self.wo, json={"status": "closed"})
        self.assertEqual(legal.status_code, 200, legal.text)
        # Terminal case accepts no new interventions
        closed = self.client.post(f"/v1/welfare/cases/{case_id}/interventions", headers=self.wo, json={
            "case_id": case_id, "kind": "routine_contact", "officer_id": "WO-7742",
            "notes_sanitized": "too late"})
        self.assertEqual(closed.status_code, 409)

    def test_06_commander_aggregates_traceable_and_suppressed(self):
        r = self.client.get("/v1/command/heatmap", headers=self.cmd)
        self.assertEqual(r.status_code, 200)
        items = r.json()
        self.assertTrue(len(items) > 0)
        suppressed = [i for i in items if i["is_suppressed"]]
        self.assertTrue(len(suppressed) > 0)
        for item in suppressed:
            self.assertIsNone(item["avg_fatigue_index"])
        visible = [i for i in items if not i["is_suppressed"]]
        self.assertTrue(len(visible) > 0)
        for item in visible:
            self.assertIsNotNone(item["methodology"])
            dist = item["risk_distribution"]
            # Company cells apportion unit totals (rounding tolerance ±2)
            self.assertLessEqual(
                abs(dist["low"] + dist["moderate"] + dist["elevated"] + dist["critical"]
                    - item["total_personnel"]), 2)
            self.assertGreaterEqual(item["avg_fatigue_index"], 0)
            self.assertLessEqual(item["avg_fatigue_index"], 10)

    def test_07_alert_lifecycle(self):
        # Critical escalation raises an alert with recorded status
        r = self.client.post("/v1/device/escalations", headers=self.z0, json={
            "pseudonym_id": "phase3-alert-pseudo",
            "tier": "critical",
            "origin": "device_fusion",
            "reason_codes": ["RC_ACUTE_DISTRESS_MARKER"],
            "detected_at": "2026-09-22T00:00:00Z"})
        self.assertEqual(r.status_code, 200, r.text)
        case_id = r.json()["case_id"]
        alerts = self.client.get("/v1/alerts", headers=self.wo).json()
        mine = [a for a in alerts if a["case_id"] == case_id]
        self.assertEqual(len(mine), 1)
        # Honest delivery note: SMTP not configured in test env
        self.assertIn("SMTP not configured", mine[0]["delivery_note"])
        self.assertEqual(mine[0]["status"], "recorded")
        ack = self.client.post(f"/v1/alerts/{mine[0]['alert_id']}/ack", headers=self.wo)
        self.assertEqual(ack.status_code, 200)
        self.assertEqual(ack.json()["status"], "acknowledged")


if __name__ == "__main__":
    unittest.main()
