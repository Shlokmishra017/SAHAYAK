#!/bin/sh
set -e

# Run database migrations
if [ -f "alembic.ini" ]; then
    echo "[*] Running Alembic database migrations..."
    alembic upgrade head || echo "[!] Alembic warning, falling back to database auto-init"
fi

# Seed deterministic demo dataset if DEMO_MODE is true
if [ "${DEMO_MODE:-true}" = "true" ]; then
    echo "[*] DEMO_MODE is active. Seeding demonstration cases..."
    python seed_demo.py || echo "[!] Demo seeding skipped or completed"
fi

echo "=========================================================="
echo "   🚀 SAHAYAK Personnel Welfare Intelligence Platform     "
echo "   Single Monolithic Service Deployment                   "
echo "   Listening on 0.0.0.0:${PORT:-8000}                     "
echo "   • Main Web Application: http://0.0.0.0:${PORT:-8000}/   "
echo "   • Executive View (v0):  http://0.0.0.0:${PORT:-8000}/v0 "
echo "   • API Base:             http://0.0.0.0:${PORT:-8000}/v1/"
echo "   • Interactive API Docs: http://0.0.0.0:${PORT:-8000}/docs"
echo "   • Health Check:         http://0.0.0.0:${PORT:-8000}/health"
echo "   • Readiness Check:      http://0.0.0.0:${PORT:-8000}/ready"
echo "=========================================================="

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
