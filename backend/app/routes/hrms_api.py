"""HRMS-ready CSV ingestion adapter (Phase 3, plan 4.1).

Conceptual pipeline:

```text
HRMS export CSV
      ↓
schema validation (required/optional columns)
      ↓
row validation (ranges, dates, units) + invalid-row report
      ↓
duplicate handling (within-file + stable pseudonym re-import → update)
      ↓
feature mapping → risk calculation (same engine + global fallback baseline)
      ↓
case creation/update (band>=2) → import summary → audit event
```

Pitch: "Sahayak provides an HRMS-ready ingestion adapter using validated
exports. The deployment adapter can be connected to the authority's actual
HRMS." This is NOT a live government HRMS integration.
"""

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit_chain import audit_ledger
from app.core.auth import require_roles
from app.core.database import CaseRecord, HrmsImportRecord, get_db
from app.ml.hr_risk_model import hr_risk_engine
from app.ml.synthetic_generator import cohort_manager

router = APIRouter(prefix="/v1/hrms", tags=["HRMS Ingestion"])
limiter = Limiter(key_func=get_remote_address)

REQUIRED_COLUMNS = [
    "service_number",
    "full_name",
    "consecutive_days_deployed",
    "rest_ratio_28d",
    "leave_denial_ratio",
    "days_since_leave_return",
    "transfers_36m",
    "family_colocated",
    "night_duty_hours_28d",
    "duty_hour_variance_28d",
    "promotion_stagnation_yrs",
]
OPTIONAL_COLUMNS = ["rank", "unit", "record_date"]

MAX_ROWS = 5000
MAX_BYTES = 2 * 1024 * 1024

# Band>=2 (emerging and above) opens/updates a case; bands 0-1 are recorded
# as below-threshold rows without a case. Review priority still follows the
# operational cut (band>=3) documented in the ModelCard.
CASE_CREATION_BAND_CUT = 2
BAND_TIER = {2: "emerging", 3: "elevated", 4: "critical"}

SAMPLE_CSV = """service_number,full_name,consecutive_days_deployed,rest_ratio_28d,leave_denial_ratio,days_since_leave_return,transfers_36m,family_colocated,night_duty_hours_28d,duty_hour_variance_28d,promotion_stagnation_yrs,rank,unit,record_date
HRMS-001,Test High Deploy,120,0.25,0.65,10,3,no,130,24,7.5,Constable,CRPF 144 Bn (CI Ops),2026-09-01
HRMS-002,Test Steady,20,0.80,0.05,180,0,yes,40,10,2.0,Head Constable,CISF Plant Security Unit,2026-09-01
HRMS-003,Test Night Load,45,0.55,0.30,30,1,no,150,28,5.0,Constable,RAF 108 Bn (Rapid Action),2026-09-01
HRMS-004,Test Invalid Row,45,1.80,0.30,30,1,yes,60,12,3.0,Constable,BSF 92 Bn (Forward Post),2026-09-01
HRMS-001,Test High Deploy,120,0.25,0.65,10,3,no,130,24,7.5,Constable,CRPF 144 Bn (CI Ops),2026-09-01
"""


class ImportSummary(BaseModel):
    import_id: str
    rows_total: int
    rows_new: int
    rows_updated: int
    rows_below_threshold: int
    rows_rejected: int
    errors: List[Dict]


def _parse_bool(value: str) -> Optional[bool]:
    v = value.strip().lower()
    if v in ("1", "true", "yes", "y"):
        return True
    if v in ("0", "false", "no", "n"):
        return False
    return None


def _validate_row(row: Dict[str, str], seen: set) -> tuple[Optional[Dict], Optional[str]]:
    svc = (row.get("service_number") or "").strip()
    if not svc:
        return None, "missing service_number"
    if svc in seen:
        return None, f"duplicate service_number in file: {svc}"
    name = (row.get("full_name") or "").strip()
    if not name:
        return None, f"{svc}: missing full_name"
    try:
        features = {
            "consecutive_days_deployed": int(float(row["consecutive_days_deployed"])),
            "rest_ratio_28d": float(row["rest_ratio_28d"]),
            "leave_denial_ratio": float(row["leave_denial_ratio"]),
            "days_since_leave_return": int(float(row["days_since_leave_return"])),
            "transfers_36m": int(float(row["transfers_36m"])),
            "night_duty_hours_28d": float(row["night_duty_hours_28d"]),
            "duty_hour_variance_28d": float(row["duty_hour_variance_28d"]),
            "promotion_stagnation_yrs": float(row["promotion_stagnation_yrs"]),
        }
    except (KeyError, TypeError, ValueError):
        return None, f"{svc}: non-numeric feature value"
    checks = [
        (0 <= features["consecutive_days_deployed"] <= 365, "consecutive_days_deployed out of range 0-365"),
        (0.0 <= features["rest_ratio_28d"] <= 1.0, "rest_ratio_28d out of range 0-1"),
        (0.0 <= features["leave_denial_ratio"] <= 1.0, "leave_denial_ratio out of range 0-1"),
        (0 <= features["days_since_leave_return"] <= 3650, "days_since_leave_return out of range"),
        (0 <= features["transfers_36m"] <= 20, "transfers_36m out of range 0-20"),
        (0 <= features["night_duty_hours_28d"] <= 300, "night_duty_hours_28d out of range 0-300"),
        (0 <= features["duty_hour_variance_28d"] <= 100, "duty_hour_variance_28d out of range"),
        (0 <= features["promotion_stagnation_yrs"] <= 40, "promotion_stagnation_yrs out of range"),
    ]
    for ok, msg in checks:
        if not ok:
            return None, f"{svc}: {msg}"
    colocated = _parse_bool(row.get("family_colocated", ""))
    if colocated is None:
        return None, f"{svc}: family_colocated must be yes/no/true/false/1/0"
    features["family_colocated"] = colocated
    unit = (row.get("unit") or "").strip() or "General Unit"
    record_date = (row.get("record_date") or "").strip()
    if record_date:
        try:
            datetime.fromisoformat(record_date)
        except ValueError:
            return None, f"{svc}: record_date must be ISO YYYY-MM-DD"
    seen.add(svc)
    return {
        "service_number": svc,
        "full_name": name,
        "features": features,
        "rank": (row.get("rank") or "").strip(),
        "unit": unit,
        "record_date": record_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }, None


def _global_baseline() -> Dict:
    """Fallback baseline across all contexts for unit-less HRMS rows."""
    df = cohort_manager.personnel_df
    if df.empty:
        return {"median": 0.50, "mad": 0.12, "count": 0}
    median = float(df["latent_stress_index"].median())
    mad = float((df["latent_stress_index"] - median).abs().median())
    return {"median": median, "mad": max(0.04, mad), "count": len(df)}


@router.get("/template")
def get_template(_user: dict = Depends(require_roles("Z1_WELFARE_OFFICER"))):
    return {
        "required_columns": REQUIRED_COLUMNS,
        "optional_columns": OPTIONAL_COLUMNS,
        "limits": {"max_rows": MAX_ROWS, "max_bytes": MAX_BYTES},
        "note": "Validated HRMS-style export adapter; not a live government HRMS integration.",
    }


@router.get("/sample-csv", response_class=PlainTextResponse)
def get_sample_csv(_user: dict = Depends(require_roles("Z1_WELFARE_OFFICER"))):
    return SAMPLE_CSV


@router.post("/import", response_model=ImportSummary)
@limiter.limit("10/minute")
def import_hrms_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("Z1_WELFARE_OFFICER")),
):
    raw = file.file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 2MB limit")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 CSV")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Empty CSV file")
    missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    rows = list(reader)
    if len(rows) > MAX_ROWS:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_ROWS} rows")

    baseline = _global_baseline()
    seen: set = set()
    errors: List[Dict] = []
    new_count = updated_count = below_count = rejected_count = 0

    for lineno, row in enumerate(rows, start=2):
        parsed, err = _validate_row(row, seen)
        if err:
            rejected_count += 1
            errors.append({"row": lineno, "error": err})
            continue
        assert parsed is not None
        record = dict(parsed["features"])
        assessed = hr_risk_engine.predict_with_confidence(record, baseline)
        band = assessed["h_band"]
        if band < CASE_CREATION_BAND_CUT:
            below_count += 1
            continue
        # Stable pseudonym: re-importing the same service_number updates.
        pseudonym_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "sahayak-hrms:" + parsed["service_number"]))
        tier = BAND_TIER[band]
        existing = list(db.scalars(
            select(CaseRecord).where(
                CaseRecord.pseudonym_id == pseudonym_id,
                CaseRecord.status != "closed",
            )
        ))
        if existing:
            case = existing[0]
            case.tier = tier
            case.reason_codes = assessed["reason_codes"]
            case.h_band = band
            case.unit_context = parsed["unit"]
            updated_count += 1
            action = "HRMS_CASE_UPDATED"
            case_id = case.case_id
        else:
            case_id = f"CASE-HRMS-{uuid.uuid4().hex[:6].upper()}"
            db.add(CaseRecord(
                case_id=case_id,
                pseudonym_id=pseudonym_id,
                tier=tier,
                origin="hr_channel",
                reason_codes=assessed["reason_codes"],
                opened_at=parsed["record_date"] + "T09:00:00Z",
                status="open",
                unit_context=parsed["unit"],
                h_band=band,
                has_acute_marker=False,
            ))
            new_count += 1
            action = "HRMS_CASE_CREATED"
        audit_ledger.append_log(
            actor_role="welfare_officer",
            actor_id=user["sub"],
            action=action,
            case_id=case_id,
            pseudonym_id=pseudonym_id,
            metadata={"tier": tier, "h_band": band, "service_number": parsed["service_number"]},
        )
    db.commit()

    import_id = f"HRMS-{uuid.uuid4().hex[:8].upper()}"
    db.add(HrmsImportRecord(
        import_id=import_id,
        filename=file.filename or "upload.csv",
        imported_by=user["sub"],
        created_at=datetime.now(timezone.utc).isoformat(),
        rows_total=len(rows),
        rows_new=new_count,
        rows_updated=updated_count,
        rows_below_threshold=below_count,
        rows_rejected=rejected_count,
    ))
    db.commit()
    audit_ledger.append_log(
        actor_role="welfare_officer",
        actor_id=user["sub"],
        action="HRMS_IMPORT_COMPLETED",
        metadata={
            "import_id": import_id, "total": len(rows), "new": new_count,
            "updated": updated_count, "below_threshold": below_count,
            "rejected": rejected_count,
        },
    )

    return ImportSummary(
        import_id=import_id,
        rows_total=len(rows),
        rows_new=new_count,
        rows_updated=updated_count,
        rows_below_threshold=below_count,
        rows_rejected=rejected_count,
        errors=errors,
    )
