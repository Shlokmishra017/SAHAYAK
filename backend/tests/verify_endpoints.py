import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    with TestClient(app) as client:
        print("=== 1. Health Check ===")
        r = client.get("/health")
        print("/health:", r.status_code, r.json())
        assert r.status_code == 200

        print("=== 2. Auth Login ===")
        tokens = {}
        for role, uid in [
            ("Z0", "CAPF-849201"),
            ("Z1_WO", "WO-7742"),
            ("Z1_CMD", "CMD-1082"),
            ("AUD", "AUD-9901")
        ]:
            r = client.post("/v1/auth/login", json={"full_name": f"Test {role}", "service_id": uid, "password": "ServicePass@2026"})
            print(f"Login {role}:", r.status_code)
            assert r.status_code == 200, r.text
            tokens[role] = r.json()["access_token"]

        h_z0 = {"Authorization": f"Bearer {tokens['Z0']}"}
        h_wo = {"Authorization": f"Bearer {tokens['Z1_WO']}"}
        h_cmd = {"Authorization": f"Bearer {tokens['Z1_CMD']}"}
        h_aud = {"Authorization": f"Bearer {tokens['AUD']}"}

        print("=== 3. Device API ===")
        r = client.post("/v1/device/attest", json={
            "device_fingerprint": "fp-12345",
            "app_version": "1.0",
            "attestation_nonce": "nonce-99"
        }, headers=h_z0)
        print("Attest:", r.status_code)
        assert r.status_code == 200

        from app.ml.synthetic_generator import cohort_manager
        real_pseudo = cohort_manager.personnel_df.iloc[0]["pseudonym_id"]
        r = client.get(f"/v1/device/risk-band/{real_pseudo}", headers=h_z0)
        print("Risk-band:", r.status_code)
        assert r.status_code == 200
        band = r.json()
        assert band["model_version"] == "sahayak-hr-gbr-v2.0-synthetic", band
        assert band["confidence"] in ("standard", "insufficient_history"), band
        assert "trend" in band, band

        r = client.get("/v1/device/risk-band/unknown-pseudo-id", headers=h_z0)
        print("Risk-band unknown:", r.status_code)
        assert r.status_code == 404, r.text

        now_iso = datetime.now(timezone.utc).isoformat()
        r = client.post("/v1/device/escalations", json={
            "pseudonym_id": "pseudo-esc-1",
            "tier": "elevated",
            "origin": "device_fusion",
            "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": now_iso
        }, headers=h_z0)
        print("Escalation:", r.status_code, r.json() if r.status_code == 200 else r.text)
        assert r.status_code == 200

        r = client.post("/v1/device/self-referral", json={
            "pseudonym_id": "pseudo-esc-1",
            "support_type_preference": "peer_buddy",
            "request_timestamp": now_iso
        }, headers=h_z0)
        print("Self-referral:", r.status_code, r.json() if r.status_code == 200 else r.text)
        assert r.status_code == 200

        r = client.post("/v1/device/erasure", json={
            "pseudonym_id": "pseudo-esc-1",
            "confirmation_token": "CONFIRM-pseudo-esc-1"
        }, headers=h_z0)
        print("Erasure:", r.status_code, r.json() if r.status_code == 200 else r.text)
        assert r.status_code == 200

        print("=== 4. Welfare API ===")
        r = client.get("/v1/welfare/cases", headers=h_wo)
        print("Welfare cases:", r.status_code)
        assert r.status_code == 200
        cases = r.json()
        assert len(cases) > 0
        # Fresh case so the script never depends on shared DB state
        r = client.post("/v1/device/escalations", json={
            "pseudonym_id": "pseudo-verify-1",
            "tier": "elevated",
            "origin": "device_fusion",
            "reason_codes": ["RC_SUSTAINED_DEPLOYMENT"],
            "detected_at": now_iso
        }, headers=h_z0)
        assert r.status_code == 200, r.text
        first_case_id = r.json()["case_id"]

        r = client.get(f"/v1/welfare/cases/{first_case_id}", headers=h_wo)
        print(f"Case detail ({first_case_id}):", r.status_code)
        assert r.status_code == 200

        r = client.post(f"/v1/welfare/cases/{first_case_id}/interventions", json={
            "case_id": first_case_id,
            "kind": "peer_buddy_nudge",
            "officer_id": "WO-7742",
            "notes_sanitized": "Assigned unit peer buddy for daily check-in"
        }, headers=h_wo)
        print(f"Log intervention ({first_case_id}):", r.status_code)
        assert r.status_code == 200

        r = client.post(f"/v1/welfare/cases/{first_case_id}/label", json={
            "case_id": first_case_id,
            "officer_id": "WO-7742",
            "label": "true_concern",
            "feedback_notes": "Confirmed sustained high operational fatigue"
        }, headers=h_wo)
        print(f"Submit label ({first_case_id}):", r.status_code)
        assert r.status_code == 200

        print("=== 5. Command API ===")
        r = client.get("/v1/command/heatmap", headers=h_cmd)
        print("Command heatmap:", r.status_code, f"{len(r.json())} items" if r.status_code == 200 else r.text)

        r = client.get("/v1/command/cohesion-anomalies", headers=h_cmd)
        print("Command anomalies:", r.status_code)

        r = client.get("/v1/command/cohort-statistics", headers=h_cmd)
        print("Command statistics:", r.status_code, r.json() if r.status_code == 200 else r.text)

        print("=== 6. Audit API ===")
        r = client.get("/v1/audit/logs", headers=h_aud)
        print("Audit logs:", r.status_code, f"total: {r.json().get('total_blocks')}" if r.status_code == 200 else r.text)

        r = client.get("/v1/audit/verify", headers=h_aud)
        print("Audit verify:", r.status_code, r.json() if r.status_code == 200 else r.text)

        print("=== 7. Identity API ===")
        r = client.get("/v1/identity/custodians-info", headers=h_wo)
        print("Identity custodians:", r.status_code, r.json() if r.status_code == 200 else r.text)

if __name__ == "__main__":
    run_tests()
