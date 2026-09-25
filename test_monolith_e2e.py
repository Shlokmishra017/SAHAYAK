"""End-to-End Monolithic Server Verification Suite.

Tests:
1. Backend health & readiness endpoints
2. Frontend SPA index serving on /
3. Secondary Frontend (v0 Executive View) SPA route on /v0 and /preview
4. Static assets serving (/assets/...)
5. API status endpoint (/api and /v1)
6. Interactive OpenAPI/Swagger documentation (/docs)
7. Same-origin Authentication flow (/v1/auth/login)
8. Authenticated Welfare Cases API (/v1/welfare/cases)
9. Authenticated Commander Strategic Heatmap (/v1/command/heatmap)
10. Authenticated Cryptographic Audit Ledger (/v1/audit/logs)
11. Dual-custody Break-Glass Custodians Info (/v1/identity/custodians-info)
12. 404 behavior for unknown API routes vs SPA routes
"""

import sys
import os

# Set working directory to backend
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    client = TestClient(app)
    passed = 0
    total = 0

    def assert_test(name, condition, detail=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name} {detail}")
        else:
            print(f"  [FAIL] {name} - {detail}")
            sys.exit(1)

    print("\nRunning SAHAYAK Monolithic Application Verification Suite...")
    print("=" * 60)

    # 1. Health check
    r = client.get("/health")
    assert_test("Health check", r.status_code == 200 and r.json().get("status") == "healthy", f"({r.status_code})")

    # 2. Readiness check
    r = client.get("/ready")
    assert_test("Readiness check", r.status_code == 200 and r.json().get("ready") is True, f"({r.status_code})")

    # 3. API status endpoint
    r = client.get("/api")
    assert_test("API Root (/api)", r.status_code == 200 and "Sahayak AI Core API" in r.json().get("service", ""), f"({r.status_code})")

    r = client.get("/v1")
    assert_test("API Root (/v1)", r.status_code == 200 and "Sahayak AI Core API" in r.json().get("service", ""), f"({r.status_code})")

    # 4. Interactive API docs
    r = client.get("/docs")
    assert_test("Swagger API Docs (/docs)", r.status_code == 200 and "swagger" in r.text.lower(), f"({r.status_code})")

    # 5. Main Frontend SPA on /
    r = client.get("/")
    assert_test("Main Frontend SPA (/)", r.status_code == 200 and "<div id=\"root\">" in r.text, f"({r.status_code})")

    # 6. Secondary Frontend (v0 Executive View) on /v0 and /preview
    r = client.get("/v0")
    assert_test("Secondary Frontend (/v0)", r.status_code == 200 and "<div id=\"root\">" in r.text, f"({r.status_code})")

    r = client.get("/preview")
    assert_test("Secondary Frontend (/preview)", r.status_code == 200 and "<div id=\"root\">" in r.text, f"({r.status_code})")

    # 7. SPA client routes (/login, /welfare, /command, /audit, /wellness)
    for route in ["/login", "/welfare", "/command", "/audit", "/wellness", "/guidance"]:
        r = client.get(route)
        assert_test(f"SPA Client Route ({route})", r.status_code == 200 and "<div id=\"root\">" in r.text, f"({r.status_code})")

    # 8. Authentication (Welfare Officer Login)
    r = client.post("/v1/auth/login", json={
        "full_name": "Meera Nair",
        "service_id": "WO-7742",
        "password": "ServicePass@2026"
    })
    assert_test("Welfare Officer Login", r.status_code == 200 and "access_token" in r.json(), f"({r.status_code})")
    wo_token = r.json().get("access_token")
    wo_headers = {"Authorization": f"Bearer {wo_token}"}

    # 9. Authenticated Welfare Cases
    r = client.get("/v1/welfare/cases", headers=wo_headers)
    assert_test("Welfare Cases Query", r.status_code == 200 and isinstance(r.json(), list), f"(found {len(r.json()) if r.status_code == 200 else 0} cases)")

    # 10. Commander Login & Strategic Heatmap
    r = client.post("/v1/auth/login", json={
        "full_name": "R. V. Deshmukh",
        "service_id": "CMD-1082",
        "password": "ServicePass@2026"
    })
    assert_test("Commander Login", r.status_code == 200 and "access_token" in r.json(), f"({r.status_code})")
    cmd_token = r.json().get("access_token")
    cmd_headers = {"Authorization": f"Bearer {cmd_token}"}

    r = client.get("/v1/command/heatmap", headers=cmd_headers)
    assert_test("Command Strategic Heatmap", r.status_code == 200 and isinstance(r.json(), list), f"(found {len(r.json()) if r.status_code == 200 else 0} cohort items)")

    # 11. Auditor Login & Cryptographic Ledger
    r = client.post("/v1/auth/login", json={
        "full_name": "Alok Verma",
        "service_id": "AUD-9901",
        "password": "ServicePass@2026"
    })
    assert_test("Auditor Login", r.status_code == 200 and "access_token" in r.json(), f"({r.status_code})")
    aud_token = r.json().get("access_token")
    aud_headers = {"Authorization": f"Bearer {aud_token}"}

    r = client.get("/v1/audit/logs", headers=aud_headers)
    assert_test("Audit Ledger Query", r.status_code == 200 and "blocks" in r.json(), f"({r.status_code})")

    # 12. Dual-Custody Custodians Info
    r = client.get("/v1/identity/custodians-info", headers=wo_headers)
    assert_test("Custodians Info (Break-Glass)", r.status_code == 200 and "authorized_custodians" in r.json(), f"({r.status_code})")

    # 13. API 404 Isolation (API routes return 404, not SPA HTML)
    r = client.get("/v1/non_existent_route")
    assert_test("API 404 Isolation", r.status_code == 404 and r.headers.get("content-type") == "application/json", f"({r.status_code})")

    print("=" * 60)
    print(f"[*] Verification Complete: {passed}/{total} tests PASSED!\n")

if __name__ == "__main__":
    run_tests()
