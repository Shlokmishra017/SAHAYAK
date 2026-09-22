"""Failure drills (Phase 5, plan 6.4): the system must fail safely and visibly.

Runnable: from backend/ ->  python tests/failure_drill.py
Each drill asserts a safe, visible failure (proper status + message, no
fabricated success, no crash). Exit 0 only if every drill passes.

Covers: expired token, unauthorized role, invalid HRMS row, duplicate HRMS
import, small cohort, tampered audit, database unreachable (/ready 503),
invalid confirmation token, unauthenticated access (backend-down contract).
"""

import io
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("WELFARE_OFFICER_ID", "WO_7742")
os.environ.setdefault("WELFARE_OFFICER_PIN", "9481")
os.environ.setdefault("MEDICAL_OFFICER_ID", "MO_3109")
os.environ.setdefault("MEDICAL_OFFICER_PIN", "6205")
os.environ.setdefault("ADJUTANT_ID", "ADJ_102")
os.environ.setdefault("ADJUTANT_PIN", "8821")

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app.core.config import settings
from app.main import app

RESULTS = []


def drill(name):
    def deco(fn):
        try:
            detail = fn()
            RESULTS.append((name, True, detail))
        except AssertionError as exc:
            RESULTS.append((name, False, f"ASSERT: {exc}"))
        except Exception as exc:  # noqa: BLE001 — a crash is itself a drill failure
            RESULTS.append((name, False, f"CRASH: {type(exc).__name__}: {exc}"))
    return deco


def login(client, service_id):
    r = client.post("/v1/auth/login", json={
        "full_name": "Drill", "service_id": service_id, "password": "ServicePass@2026"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def main():
    with TestClient(app) as client:
        wo = login(client, "WO-7742")
        cmd = login(client, "CMD-1082")
        z0 = login(client, "CAPF-849201")
        aud = login(client, "AUD-9901")

        @drill("expired token -> 401, no data")
        def _():
            now = datetime.now(timezone.utc)
            token = jwt.encode({
                "sub": "WO-7742", "role": "Z1_WELFARE_OFFICER", "name": "X",
                "iss": settings.jwt_issuer,
                "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1),
            }, settings.jwt_secret, algorithm="HS256")
            r = client.get("/v1/welfare/cases",
                           headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 401, r.status_code
            return "rejected with 401"

        @drill("unauthorized role -> 403, no data")
        def _():
            r = client.get("/v1/welfare/cases", headers=z0)
            assert r.status_code == 403, r.status_code
            assert "CASE" not in r.text
            return "rejected with 403, no case data leaked"

        @drill("unauthenticated (backend-down contract) -> 401 JSON")
        def _():
            r = client.get("/v1/welfare/cases")
            assert r.status_code == 401, r.status_code
            assert r.json()["detail"] == "Authentication required"
            return "frontend renders Backend unavailable from this shape"

        @drill("invalid HRMS row -> rejected with row report, file accepted")
        def _():
            csv = ("service_number,full_name,consecutive_days_deployed,rest_ratio_28d,"
                   "leave_denial_ratio,days_since_leave_return,transfers_36m,family_colocated,"
                   "night_duty_hours_28d,duty_hour_variance_28d,promotion_stagnation_yrs\n"
                   "HRMS-D01,Bad Range,10,9.99,0.1,5,0,yes,40,8,1.0\n")
            r = client.post("/v1/hrms/import", headers=wo,
                            files={"file": ("d.csv", io.BytesIO(csv.encode()), "text/csv")})
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["rows_rejected"] == 1 and body["errors"], body
            return f"row 2 rejected: {body['errors'][0]['error']}"

        @drill("duplicate HRMS import -> update, no duplicate case")
        def _():
            csv = ("service_number,full_name,consecutive_days_deployed,rest_ratio_28d,"
                   "leave_denial_ratio,days_since_leave_return,transfers_36m,family_colocated,"
                   "night_duty_hours_28d,duty_hour_variance_28d,promotion_stagnation_yrs\n"
                   "HRMS-D02,Dupe Test,120,0.25,0.65,10,3,no,130,24,7.5\n")
            files = lambda: {"file": ("d.csv", io.BytesIO(csv.encode()), "text/csv")}
            first = client.post("/v1/hrms/import", headers=wo, files=files()).json()
            second = client.post("/v1/hrms/import", headers=wo, files=files()).json()
            assert second["rows_updated"] >= 1, second
            import uuid
            pseudo = str(uuid.uuid5(uuid.NAMESPACE_URL, "sahayak-hrms:HRMS-D02"))
            from app.core.database import CaseRecord, SessionLocal
            with SessionLocal() as db:
                open_cases = [c for c in db.query(CaseRecord).filter(
                    CaseRecord.pseudonym_id == pseudo).all() if c.status != "closed"]
            assert len(open_cases) == 1, len(open_cases)
            return f"new={first['rows_new']} then updated={second['rows_updated']}, one open case"

        @drill("small cohort -> suppressed, aggregates null")
        def _():
            items = client.get("/v1/command/heatmap", headers=cmd).json()
            small = [i for i in items if i["is_suppressed"]]
            assert small, "no suppressed cohort found"
            assert all(i["avg_fatigue_index"] is None for i in small)
            return f"{len(small)} suppressed cohort(s), no leakage"

        @drill("tampered audit -> verify fails with block seq; restore heals")
        def _():
            assert client.get("/v1/audit/verify", headers=aud).json()["is_valid"]
            t = client.post("/v1/audit/tamper-simulation?block_seq=1", headers=aud).json()
            assert t["verification_result"]["is_valid"] is False
            seq = t["verification_result"]["broken_sequence_block"]
            assert seq == 1, seq
            client.post("/v1/audit/restore-chain", headers=aud)
            assert client.get("/v1/audit/verify", headers=aud).json()["is_valid"]
            return "breach at block 1 detected, then restored"

        @drill("database unreachable -> /ready 503, /health stays process-only")
        def _():
            assert client.get("/health").status_code == 200
            broken = create_engine("postgresql+psycopg://u:p@127.0.0.1:1/db")
            with patch("app.core.database.engine", broken):
                r = client.get("/ready")
                assert r.status_code == 503, r.status_code
                assert r.json()["ready"] is False
            assert client.get("/ready").status_code == 200
            return "readiness reflects DB state; liveness does not lie"

        @drill("invalid confirmation token -> 400 with guidance")
        def _():
            r = client.post("/v1/device/erasure", headers=z0, json={
                "pseudonym_id": "phase5-drill-pseudo", "confirmation_token": "WRONG"})
            assert r.status_code == 400, r.status_code
            assert "CONFIRM" in r.json()["detail"]
            return "rejected with token format guidance"

    print("\n===== FAILURE DRILLS =====")
    failed = 0
    for name, ok, detail in RESULTS:
        print(f"[{'PASS' if ok else 'FAIL'}] {name} — {detail}")
        failed += 0 if ok else 1
    print(f"======================== {len(RESULTS) - failed}/{len(RESULTS)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
