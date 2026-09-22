"""Persistence for cases, interventions, audit blocks, and idempotency keys."""

from datetime import datetime, timezone
from typing import Generator, Optional

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text, create_engine, event, select, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class CaseRecord(Base):
    __tablename__ = "cases"
    __table_args__ = (
        Index('ix_cases_closed_at', 'closed_at'),
        Index('ix_cases_tier_status', 'tier', 'status'),
    )

    case_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    pseudonym_id: Mapped[str] = mapped_column(String(128), index=True)
    tier: Mapped[str] = mapped_column(String(20), index=True)
    origin: Mapped[str] = mapped_column(String(30))
    reason_codes: Mapped[list] = mapped_column(JSON)
    opened_at: Mapped[str] = mapped_column(String(64), index=True)
    closed_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    unit_context: Mapped[str] = mapped_column(String(160))
    h_band: Mapped[int] = mapped_column(Integer, nullable=False)
    has_acute_marker: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    officer_label: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class InterventionRecord(Base):
    __tablename__ = "interventions"

    intervention_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(80), index=True)
    kind: Mapped[str] = mapped_column(String(50))
    performed_by_role: Mapped[str] = mapped_column(String(50))
    officer_id: Mapped[str] = mapped_column(String(128))
    performed_at: Mapped[str] = mapped_column(String(64))
    notes_sanitized: Mapped[str] = mapped_column(Text)
    target_concern: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    follow_up_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    outcome_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class AuditBlockRecord(Base):
    __tablename__ = "audit_blocks"
    __table_args__ = (Index('ix_audit_prev_hash', 'prev_hash'),)

    seq: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String(64))
    actor_role: Mapped[str] = mapped_column(String(50))
    actor_id_hash: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(100))
    case_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    pseudonym_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON)
    prev_hash: Mapped[str] = mapped_column(String(64))
    block_hash: Mapped[str] = mapped_column(String(64), unique=True)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (Index('ix_idempotency_created_at', 'created_at'),)

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class IdentityRegistry(Base):
    __tablename__ = "identity_registry"

    pseudonym_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    service_number: Mapped[str] = mapped_column(String(50))
    full_name: Mapped[str] = mapped_column(String(100))
    rank: Mapped[str] = mapped_column(String(50))
    unit: Mapped[str] = mapped_column(String(100))
    blood_group: Mapped[str] = mapped_column(String(10))
    emergency_contact_phone: Mapped[str] = mapped_column(String(20))
    emergency_contact_name: Mapped[str] = mapped_column(String(100))
    base_location: Mapped[str] = mapped_column(String(100))


class BreakGlassRequestRecord(Base):
    """Persistent dual-custody break-glass registry (survives backend restart)."""

    __tablename__ = "break_glass_requests"

    request_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(80), index=True)
    pseudonym_id: Mapped[str] = mapped_column(String(128), index=True)
    requester_sub: Mapped[str] = mapped_column(String(128))
    custodian_1_id: Mapped[str] = mapped_column(String(128))
    custodian_2_id: Mapped[str] = mapped_column(String(128))
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="authorized", nullable=False)
    created_at: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[str] = mapped_column(String(64), index=True)
    audit_seq: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class HrmsImportRecord(Base):
    """One row per CSV import run (audit + duplicate handling)."""

    __tablename__ = "hrms_imports"

    import_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    filename: Mapped[str] = mapped_column(String(200))
    imported_by: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[str] = mapped_column(String(64))
    rows_total: Mapped[int] = mapped_column(Integer)
    rows_new: Mapped[int] = mapped_column(Integer)
    rows_updated: Mapped[int] = mapped_column(Integer)
    rows_below_threshold: Mapped[int] = mapped_column(Integer)
    rows_rejected: Mapped[int] = mapped_column(Integer)


class AlertRecord(Base):
    """Internal alert events for critical welfare signals."""

    __tablename__ = "alerts"

    alert_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(80), index=True)
    pseudonym_id: Mapped[str] = mapped_column(String(128), index=True)
    tier: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(200))
    channel: Mapped[str] = mapped_column(String(30), default="internal", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="recorded", index=True, nullable=False)
    delivery_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    created_at: Mapped[str] = mapped_column(String(64))
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    acknowledged_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


# SQLite gets WAL + relaxed sync for local dev; other dialects use pooling.
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(settings.database_url, connect_args=connect_args)

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.close()
else:
    engine = create_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_added_columns()


def _ensure_added_columns() -> None:
    """Additive SQLite migration for columns introduced after first deploy.

    `create_all` never alters existing tables, so long-lived dev databases
    would otherwise miss new nullable columns. Only ADD COLUMN (safe).
    """
    additions = {
        "interventions": [
            ("target_concern", "VARCHAR(120)"),
            ("follow_up_date", "VARCHAR(64)"),
            ("outcome", "VARCHAR(40)"),
            ("outcome_score", "INTEGER"),
        ],
    }
    try:
        with engine.connect() as conn:
            for table, cols in additions.items():
                existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
                for name, ddl in cols:
                    if name not in existing:
                        conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
            conn.commit()
    except Exception:
        # Non-SQLite dialects are handled by Alembic in Phase 4; never break startup.
        pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_case(db: Session, case_id: str) -> Optional[CaseRecord]:
    return db.get(CaseRecord, case_id)


def list_cases(db: Session) -> list[CaseRecord]:
    return list(db.scalars(select(CaseRecord)))


def case_dict(db: Session, case: CaseRecord) -> dict:
    interventions = list(db.scalars(select(InterventionRecord).where(InterventionRecord.case_id == case.case_id)))
    return {
        "case_id": case.case_id,
        "pseudonym_id": case.pseudonym_id,
        "tier": case.tier,
        "origin": case.origin,
        "reason_codes": case.reason_codes,
        "opened_at": case.opened_at,
        "closed_at": case.closed_at,
        "status": case.status,
        "unit_context": case.unit_context,
        "h_band": case.h_band,
        "has_acute_marker": case.has_acute_marker,
        "officer_label": case.officer_label,
        "interventions": [
            {
                "intervention_id": item.intervention_id,
                "case_id": item.case_id,
                "kind": item.kind,
                "performed_by_role": item.performed_by_role,
                "officer_id": item.officer_id,
                "performed_at": item.performed_at,
                "notes_sanitized": item.notes_sanitized,
                "target_concern": item.target_concern,
                "follow_up_date": item.follow_up_date,
                "outcome": item.outcome,
                "outcome_score": item.outcome_score,
            }
            for item in interventions
        ],
    }