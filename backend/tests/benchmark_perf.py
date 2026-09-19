import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.routes.welfare_api import limiter as welfare_limiter

def benchmark():
    app.state.limiter.enabled = False
    welfare_limiter.enabled = False
    with TestClient(app) as client:
        # Auth login to get tokens
        res_wo = client.post("/v1/auth/login", json={"full_name": "Meera Nair", "service_id": "WO-7742", "password": "ServicePass@2026"})
        token_wo = res_wo.json()["access_token"]
        h_wo = {"Authorization": f"Bearer {token_wo}"}

        res_z0 = client.post("/v1/auth/login", json={"full_name": "Vikram Singh", "service_id": "CAPF-849201", "password": "ServicePass@2026"})
        token_z0 = res_z0.json()["access_token"]
        h_z0 = {"Authorization": f"Bearer {token_z0}"}

        res_cmd = client.post("/v1/auth/login", json={"full_name": "R. V. Deshmukh", "service_id": "CMD-1082", "password": "ServicePass@2026"})
        token_cmd = res_cmd.json()["access_token"]
        h_cmd = {"Authorization": f"Bearer {token_cmd}"}

        N = 100

        # Benchmark 1: Device Risk Band (O(1) lookup vs N iterations)
        t0 = time.perf_counter()
        for _ in range(N):
            r = client.get("/v1/device/risk-band/f83a1290-7d1a-4c22-98ab-3011982bca81", headers=h_z0)
            assert r.status_code == 200
        t1 = time.perf_counter()
        device_ms = ((t1 - t0) / N) * 1000

        # Benchmark 2: Welfare Cases list (No N+1)
        t0 = time.perf_counter()
        for _ in range(N):
            r = client.get("/v1/welfare/cases", headers=h_wo)
            assert r.status_code == 200
        t1 = time.perf_counter()
        welfare_ms = ((t1 - t0) / N) * 1000

        # Benchmark 3: Command Heatmap (Memoized sub-unit aggregation)
        t0 = time.perf_counter()
        for _ in range(N):
            r = client.get("/v1/command/heatmap", headers=h_cmd)
            assert r.status_code == 200
        t1 = time.perf_counter()
        command_ms = ((t1 - t0) / N) * 1000

        print(f"RESULTS (over {N} iterations each):")
        print(f" - Device Risk Band Latency: {device_ms:.2f} ms / req")
        print(f" - Welfare Cases Latency:   {welfare_ms:.2f} ms / req")
        print(f" - Command Heatmap Latency:  {command_ms:.2f} ms / req")

if __name__ == "__main__":
    benchmark()
