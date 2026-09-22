"""Baseline schema: all Phase 1-3 tables with indexes.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-22
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cases",
        sa.Column("case_id", sa.String(80), primary_key=True),
        sa.Column("pseudonym_id", sa.String(128), index=True, nullable=False),
        sa.Column("tier", sa.String(20), index=True, nullable=False),
        sa.Column("origin", sa.String(30), nullable=False),
        sa.Column("reason_codes", sa.JSON(), nullable=False),
        sa.Column("opened_at", sa.String(64), index=True, nullable=False),
        sa.Column("closed_at", sa.String(64), nullable=True),
        sa.Column("status", sa.String(30), index=True, nullable=False),
        sa.Column("unit_context", sa.String(160), nullable=False),
        sa.Column("h_band", sa.Integer(), nullable=False),
        sa.Column("has_acute_marker", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("officer_label", sa.String(30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Index("ix_cases_closed_at", "closed_at"),
        sa.Index("ix_cases_tier_status", "tier", "status"),
    )
    op.create_table(
        "interventions",
        sa.Column("intervention_id", sa.String(80), primary_key=True),
        sa.Column("case_id", sa.String(80), index=True, nullable=False),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("performed_by_role", sa.String(50), nullable=False),
        sa.Column("officer_id", sa.String(128), nullable=False),
        sa.Column("performed_at", sa.String(64), nullable=False),
        sa.Column("notes_sanitized", sa.Text(), nullable=False),
        sa.Column("target_concern", sa.String(120), nullable=True),
        sa.Column("follow_up_date", sa.String(64), nullable=True),
        sa.Column("outcome", sa.String(40), nullable=True),
        sa.Column("outcome_score", sa.Integer(), nullable=True),
    )
    op.create_table(
        "audit_blocks",
        sa.Column("seq", sa.Integer(), primary_key=True),
        sa.Column("timestamp", sa.String(64), nullable=False),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("actor_id_hash", sa.String(64), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("case_id", sa.String(80), nullable=True),
        sa.Column("pseudonym_id", sa.String(128), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("prev_hash", sa.String(64), nullable=False),
        sa.Column("block_hash", sa.String(64), unique=True, nullable=False),
        sa.Index("ix_audit_prev_hash", "prev_hash"),
    )
    op.create_table(
        "idempotency_records",
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("case_id", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Index("ix_idempotency_created_at", "created_at"),
    )
    op.create_table(
        "identity_registry",
        sa.Column("pseudonym_id", sa.String(128), primary_key=True),
        sa.Column("service_number", sa.String(50), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("rank", sa.String(50), nullable=False),
        sa.Column("unit", sa.String(100), nullable=False),
        sa.Column("blood_group", sa.String(10), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=False),
        sa.Column("emergency_contact_name", sa.String(100), nullable=False),
        sa.Column("base_location", sa.String(100), nullable=False),
    )
    op.create_table(
        "break_glass_requests",
        sa.Column("request_id", sa.String(80), primary_key=True),
        sa.Column("case_id", sa.String(80), index=True, nullable=False),
        sa.Column("pseudonym_id", sa.String(128), index=True, nullable=False),
        sa.Column("requester_sub", sa.String(128), nullable=False),
        sa.Column("custodian_1_id", sa.String(128), nullable=False),
        sa.Column("custodian_2_id", sa.String(128), nullable=False),
        sa.Column("justification", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="authorized"),
        sa.Column("created_at", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.String(64), index=True, nullable=False),
        sa.Column("audit_seq", sa.Integer(), nullable=True),
    )
    op.create_table(
        "hrms_imports",
        sa.Column("import_id", sa.String(80), primary_key=True),
        sa.Column("filename", sa.String(200), nullable=False),
        sa.Column("imported_by", sa.String(128), nullable=False),
        sa.Column("created_at", sa.String(64), nullable=False),
        sa.Column("rows_total", sa.Integer(), nullable=False),
        sa.Column("rows_new", sa.Integer(), nullable=False),
        sa.Column("rows_updated", sa.Integer(), nullable=False),
        sa.Column("rows_below_threshold", sa.Integer(), nullable=False),
        sa.Column("rows_rejected", sa.Integer(), nullable=False),
    )
    op.create_table(
        "alerts",
        sa.Column("alert_id", sa.String(80), primary_key=True),
        sa.Column("case_id", sa.String(80), index=True, nullable=False),
        sa.Column("pseudonym_id", sa.String(128), index=True, nullable=False),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(200), nullable=False),
        sa.Column("channel", sa.String(30), nullable=False, server_default="internal"),
        sa.Column("status", sa.String(30), nullable=False, server_default="recorded", index=True),
        sa.Column("delivery_note", sa.String(300), nullable=False, server_default=""),
        sa.Column("created_at", sa.String(64), nullable=False),
        sa.Column("acknowledged_by", sa.String(128), nullable=True),
        sa.Column("acknowledged_at", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    for table in (
        "alerts",
        "hrms_imports",
        "break_glass_requests",
        "identity_registry",
        "idempotency_records",
        "audit_blocks",
        "interventions",
        "cases",
    ):
        op.drop_table(table)
