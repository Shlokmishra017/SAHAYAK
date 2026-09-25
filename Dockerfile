# ==============================================================================
# SAHAYAK Monolithic Application Container
# Single Container · Single Service · Single Port · Zero-Config Hackathon Deploy
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the unified frontend (Main platform + v0 executive view)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependencies first for efficient layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source code and configuration
COPY frontend/ ./

# Build production bundle to dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Runtime (FastAPI + SQLite + Frontend SPA)
# ------------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEMO_MODE=true \
    DATABASE_URL=sqlite:///./sahayak.db \
    FRONTEND_DIST=/app/frontend/dist \
    HOST=0.0.0.0 \
    PORT=8000 \
    JWT_SECRET=sahayak-production-monolith-deployment-secret-32-chars-min \
    JWT_ISSUER=sahayak-api \
    JWT_EXPIRY_MINUTES=60 \
    CORS_ORIGINS="*" \
    WELFARE_OFFICER_ID=WO_7742 \
    WELFARE_OFFICER_PIN=9481 \
    MEDICAL_OFFICER_ID=MO_3109 \
    MEDICAL_OFFICER_PIN=6205 \
    ADJUTANT_ID=ADJ_102 \
    ADJUTANT_PIN=8821 \
    BREAK_GLASS_TTL_MINUTES=15

WORKDIR /app

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY backend/eval_model.py ./
COPY backend/seed_demo.py ./
COPY backend/run_server.py ./

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Preserve v0frontend files for repository completeness
COPY v0frontend ./v0frontend

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
