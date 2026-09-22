"""One real alert channel (Phase 3, plan 4.7).

Demonstrates: critical event → alert generated → recipient notified →
alert status recorded.

Delivery honesty: external e-mail delivery is attempted only when SMTP is
configured via environment (`ALERT_SMTP_HOST`, `ALERT_SMTP_PORT`,
`ALERT_SMTP_USER`, `ALERT_SMTP_PASSWORD`, `ALERT_SMTP_FROM`,
`ALERT_SMTP_TO`). Otherwise the alert is recorded internally with status
`recorded` and an explicit delivery note that external delivery is a
deployment configuration. An in-app toast is never called alerting.
"""

import os
import smtplib
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles
from app.core.database import AlertRecord, get_db

router = APIRouter(prefix="/v1/alerts", tags=["Alerts"])
limiter = Limiter(key_func=get_remote_address)


def _smtp_config() -> Optional[dict]:
    host = os.getenv("ALERT_SMTP_HOST", "")
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.getenv("ALERT_SMTP_PORT", "587")),
        "user": os.getenv("ALERT_SMTP_USER", ""),
        "password": os.getenv("ALERT_SMTP_PASSWORD", ""),
        "from_addr": os.getenv("ALERT_SMTP_FROM", "sahayak@localhost"),
        "to_addr": os.getenv("ALERT_SMTP_TO", ""),
    }


def send_alert_email(subject: str, body: str) -> tuple[bool, str]:
    """Attempt real SMTP delivery. Returns (delivered, note)."""
    cfg = _smtp_config()
    if not cfg or not cfg["to_addr"]:
        return False, "deployment configuration: SMTP not configured; internal record only"
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = cfg["from_addr"]
        msg["To"] = cfg["to_addr"]
        msg.set_content(body)
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as smtp:
            smtp.starttls()
            if cfg["user"]:
                smtp.login(cfg["user"], cfg["password"])
            smtp.send_message(msg)
        return True, f"delivered via SMTP to {cfg['to_addr']}"
    except Exception as exc:
        return False, f"delivery failed ({str(exc)[:120]}); internal record retained"


def raise_alert(
    db: Session,
    *,
    case_id: str,
    pseudonym_id: str,
    tier: str,
    reason: str,
    actor_sub: str = "system",
) -> AlertRecord:
    alert_id = f"ALERT-{uuid.uuid4().hex[:8].upper()}"
    delivered, note = send_alert_email(
        subject=f"[Sahayak] {tier.upper()} welfare alert — {case_id}",
        body=(
            f"A {tier} welfare signal was recorded.\n"
            f"Case: {case_id}\nPseudonym: {pseudonym_id[:8]}...\nReason: {reason}\n"
            f"Review in the welfare queue. Identity stays pseudonymous."
        ),
    )
    record = AlertRecord(
        alert_id=alert_id,
        case_id=case_id,
        pseudonym_id=pseudonym_id,
        tier=tier,
        reason=reason,
        channel="email" if delivered else "internal",
        status="delivered" if delivered else "recorded",
        delivery_note=note,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(record)
    audit_ledger.append_log(
        actor_role="alerting_service",
        actor_id=actor_sub,
        action="WELFARE_ALERT_RAISED",
        case_id=case_id,
        pseudonym_id=pseudonym_id,
        metadata={"alert_id": alert_id, "tier": tier, "status": record.status},
    )
    return record


def _alert_dict(a: AlertRecord) -> dict:
    return {
        "alert_id": a.alert_id,
        "case_id": a.case_id,
        "tier": a.tier,
        "reason": a.reason,
        "channel": a.channel,
        "status": a.status,
        "delivery_note": a.delivery_note,
        "created_at": a.created_at,
        "acknowledged_by": a.acknowledged_by,
        "acknowledged_at": a.acknowledged_at,
    }


@router.get("")
@limiter.limit("60/minute")
def list_alerts(
    request: Request,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_roles("Z1_WELFARE_OFFICER", "Z1_COMMANDER")),
):
    rows = list(db.scalars(select(AlertRecord).order_by(AlertRecord.created_at.desc()).limit(200)))
    if status:
        rows = [r for r in rows if r.status == status]
    return [_alert_dict(r) for r in rows]


@router.post("/{alert_id}/ack")
@limiter.limit("30/minute")
def acknowledge_alert(
    request: Request,
    alert_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    record = db.get(AlertRecord, alert_id)
    if not record:
        raise HTTPException(status_code=404, detail="Alert not found.")
    record.status = "acknowledged"
    record.acknowledged_by = user["sub"]
    record.acknowledged_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="WELFARE_ALERT_ACKNOWLEDGED",
        case_id=record.case_id,
        metadata={"alert_id": alert_id},
    )
    return _alert_dict(record)
