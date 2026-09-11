"""
API Contracts & Request/Response Schemas
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# Device (Z0)
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
    h_band: int  # 0 to 4
    reason_codes: List[str]
    thresholds: Dict[str, float]  # {"tau1": 0.45, "tau2": 0.65, "tau3": 0.85}
    unit_baseline_median: float
    model_version: str

class EscalationPayload(BaseModel):
    pseudonym_id: str
    tier: str  # "emerging" | "elevated" | "critical"
    origin: str = "device_fusion"  # "device_fusion" | "hr_channel" | "self_referral"
    reason_codes: List[str]
    detected_at: str
    model_version: str = "sahayak-edge-v1.2"

class SelfReferralRequest(BaseModel):
    pseudonym_id: str
    support_type_preference: str  # "counselor" | "buddy" | "medical" | "general_welfare"
    request_timestamp: str

# Welfare Officer (Z1)
class CaseFilterParams(BaseModel):
    tier: Optional[str] = None
    status: Optional[str] = None
    unit: Optional[str] = None

class WelfareCaseSummary(BaseModel):
    case_id: str
    pseudonym_id: str
    tier: str  # "emerging" | "elevated" | "critical"
    origin: str
    reason_codes: List[str]
    opened_at: str
    closed_at: Optional[str] = None
    status: str  # "open" | "in_review" | "intervention_active" | "closed"
    unit_context: str
    h_band: int
    has_acute_marker: bool = False
    officer_label: Optional[str] = None  # "true_concern" | "false_alarm" | "inconclusive"
    interventions_count: int = 0

class InterventionCreate(BaseModel):
    case_id: str
    kind: str  # "peer_buddy_nudge" | "welfare_counseling" | "medical_leave_recommended" | "duty_stand_down" | "family_liaison"
    performed_by_role: str = "welfare_officer"
    officer_id: str
    notes_sanitized: str  # Non-clinical welfare notes

class LabelFeedbackCreate(BaseModel):
    case_id: str
    officer_id: str
    label: str  # "true_concern" | "false_alarm" | "inconclusive"
    feedback_notes: Optional[str] = None

# Commander (Z1)
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
    risk_distribution: Optional[Dict[str, int]] = None
    workload_score: Optional[float] = None
    rotation_recommendation: Optional[str] = None

# Erasure Request (DPDP Compliance)
class ErasureRequest(BaseModel):
    pseudonym_id: str
    confirmation_token: str
