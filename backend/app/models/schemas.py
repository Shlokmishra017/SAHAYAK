"""API request/response contracts."""
from typing import Dict, List, Optional
from pydantic import BaseModel

class DeviceAttestationRequest(BaseModel):
    device_fingerprint: str
    app_version: str
    attestation_nonce: str

class DeviceAttestationResponse(BaseModel):
    attestation_token: str
    expires_in_seconds: int
    is_attested: bool

class RiskBandResponse(BaseModel):
    pseudonym_id: str
    as_of: str
    h_band: int
    reason_codes: List[str]
    thresholds: Dict[str, float]
    unit_baseline_median: float
    model_version: str

class EscalationPayload(BaseModel):
    pseudonym_id: str
    tier: str
    origin: str = "device_fusion"
    reason_codes: List[str]
    detected_at: str
    model_version: str = "sahayak-edge-v1.2"

class SelfReferralRequest(BaseModel):
    pseudonym_id: str
    support_type_preference: str
    request_timestamp: str

class CaseFilterParams(BaseModel):
    tier: Optional[str] = None
    status: Optional[str] = None
    unit: Optional[str] = None

class WelfareCaseSummary(BaseModel):
    case_id: str
    pseudonym_id: str
    tier: str
    origin: str
    reason_codes: List[str]
    opened_at: str
    closed_at: Optional[str] = None
    status: str
    unit_context: str
    h_band: int
    has_acute_marker: bool = False
    officer_label: Optional[str] = None
    interventions_count: int = 0

class InterventionCreate(BaseModel):
    case_id: str
    kind: str
    performed_by_role: str = "welfare_officer"
    officer_id: str
    notes_sanitized: str

class LabelFeedbackCreate(BaseModel):
    case_id: str
    officer_id: str
    label: str
    feedback_notes: Optional[str] = None

class HeatmapQuery(BaseModel):
    force_type: Optional[str] = None

class CohortHeatmapItem(BaseModel):
    cohort_name: str
    parent_unit: str
    force_type: str
    total_personnel: int
    is_suppressed: bool
    is_complementary_suppressed: bool = False
    suppression_reason: Optional[str] = None
    avg_fatigue_index: Optional[float] = None
    risk_distribution: Optional[Dict[str, Optional[int]]] = None
    workload_score: Optional[float] = None
    rotation_recommendation: Optional[str] = None

# DPDP right-to-erasure request.
class ErasureRequest(BaseModel):
    pseudonym_id: str
    confirmation_token: str
