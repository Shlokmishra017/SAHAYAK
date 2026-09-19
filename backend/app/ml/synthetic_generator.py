"""
Synthetic Cohort Generator
Generates realistic 24-month longitudinal latent-state stress profiles for 5,000 personnel.
Includes:
- 4 Operational Deployment Contexts with distinct baseline stress distributions:
  1. Border Guarding (BSF / ITBP): High isolation, weather extremes, long deployment spells.
  2. Counter-Insurgency (CRPF / RR): Combat threat, acute alertness fatigue, casualty exposure.
  3. Public Order (RAF / State Police): Acute episodic crowd control, fragmented sleep, sudden call-outs.
  4. Static Security (CISF / Police HQ): Lower physical hazard, routine shifts, stagnation risk.
- Non-linear post-leave hazard curve (peaking between days 7-21).
- Operational features (consecutive days deployed, leave denial ratio, duty variance, night duty hours).
- Observation generation: mood check-in (1-5), sleep hours, fatigue, journal sentiment, and missingness.
"""

import numpy as np
import pandas as pd
import uuid
import random
from typing import Dict, List, Tuple
from app.core.security import IdentityBroker, RealIdentityProfile

DEPLOYMENT_CONTEXTS = [
    {
        "context": "counter_insurgency",
        "force_name": "CRPF 144 Bn (CI Ops)",
        "base_stress_mean": 0.58,
        "base_stress_std": 0.15,
        "avg_deployment_days": 75,
        "leave_denial_prob": 0.28,
        "night_shift_mean": 85.0
    },
    {
        "context": "border_guarding",
        "force_name": "BSF 92 Bn (Forward Post)",
        "base_stress_mean": 0.52,
        "base_stress_std": 0.14,
        "avg_deployment_days": 90,
        "leave_denial_prob": 0.22,
        "night_shift_mean": 70.0
    },
    {
        "context": "public_order",
        "force_name": "RAF 108 Bn (Rapid Action)",
        "base_stress_mean": 0.44,
        "base_stress_std": 0.16,
        "avg_deployment_days": 35,
        "leave_denial_prob": 0.18,
        "night_shift_mean": 95.0
    },
    {
        "context": "static_guarding",
        "force_name": "CISF Plant Security Unit",
        "base_stress_mean": 0.32,
        "base_stress_std": 0.12,
        "avg_deployment_days": 15,
        "leave_denial_prob": 0.10,
        "night_shift_mean": 45.0
    }
]

RANKS = ["Constable", "Head Constable", "Assistant Sub-Inspector", "Sub-Inspector", "Inspector"]
FIRST_NAMES = ["Rajesh", "Vikram", "Gurpreet", "Santosh", "Manish", "Amit", "Dharmendra", "Sanjay", "Balwinder", "Manoj", "Kavita", "Pooja", "Arjun", "Deepak", "Ramesh"]
LAST_NAMES = ["Kumar", "Singh", "Sharma", "Yadav", "Patel", "Verma", "Rathore", "Kaur", "Thakur", "Deshmukh", "Nair", "Mishra", "Gupta", "Chauhan"]

class SyntheticCohortManager:
    def __init__(self, seed: int = 42):
        np.random.seed(seed)
        random.seed(seed)
        self.personnel_df: pd.DataFrame = pd.DataFrame()
        self.pseudonym_index: Dict[str, dict] = {}
        self.cohort_stats: Dict[str, Dict] = {}

    def generate_cohort(self, n_samples: int = 1200) -> pd.DataFrame:
        """
        Generates longitudinal profiles for synthetic personnel.
        """
        records = []
        for i in range(n_samples):
            ctx_config = random.choice(DEPLOYMENT_CONTEXTS)
            pseudonym_id = str(uuid.uuid4())
            
            # Operational parameters
            consecutive_days = int(np.clip(np.random.normal(ctx_config["avg_deployment_days"], 25), 0, 180))
            rest_ratio_28d = float(np.clip(np.random.beta(5, 2 if consecutive_days < 45 else 7), 0.05, 0.95))
            
            leave_applied = random.randint(2, 6)
            denial_chance = ctx_config["leave_denial_prob"] + (0.15 if consecutive_days > 60 else 0.0)
            leave_denied = int(np.random.binomial(leave_applied, min(0.85, denial_chance)))
            leave_denial_ratio = float(leave_denied / leave_applied) if leave_applied > 0 else 0.0
            
            # Days since returning from leave (simulates post-leave return window)
            has_recent_leave = random.random() < 0.40
            days_since_leave_return = random.randint(1, 90) if has_recent_leave else 180
            
            # Non-linear post-leave hazard factor (peaking days 7 to 21)
            if 7 <= days_since_leave_return <= 21:
                # Bell-shaped hazard bump
                post_leave_hazard = np.exp(-((days_since_leave_return - 14) ** 2) / (2 * (5 ** 2))) * 0.35
            else:
                post_leave_hazard = 0.0

            transfers_36m = random.randint(0, 4)
            family_colocated = random.random() < (0.25 if ctx_config["context"] in ["counter_insurgency", "border_guarding"] else 0.65)
            
            night_duty_hours = float(np.clip(np.random.normal(ctx_config["night_shift_mean"], 20), 10, 160))
            duty_hour_variance = float(np.clip(np.random.normal(15, 6), 2, 40))
            promotion_stagnation_yrs = float(np.clip(np.random.exponential(4.0), 0.5, 16.0))
            
            # Latent True Stress State (continuous 0.0 to 1.0)
            latent_stress = (
                ctx_config["base_stress_mean"]
                + (consecutive_days / 180.0) * 0.25
                + (leave_denial_ratio * 0.30)
                + post_leave_hazard
                + ((1.0 - rest_ratio_28d) * 0.20)
                + (0.10 if not family_colocated else -0.08)
                + (night_duty_hours / 160.0) * 0.15
                + np.random.normal(0, 0.08)
            )
            latent_stress = float(np.clip(latent_stress, 0.02, 0.98))
            
            # Synthetic wellness observations derived from latent stress (on-device signals)
            # Higher stress -> lower mood, worse sleep, negative journal sentiment
            mood_mean = np.clip(5.0 - (latent_stress * 3.8), 1.0, 5.0)
            sleep_mean = np.clip(7.8 - (latent_stress * 3.6), 3.0, 8.5)
            journal_sentiment = np.clip(0.65 - (latent_stress * 1.3), -0.95, 0.95)
            
            # Missingness: Stressed individuals frequently stop reporting (critical realistic behavior)
            reporting_compliance = np.clip(0.95 - (latent_stress * 0.40), 0.20, 0.98)
            app_active = random.random() < reporting_compliance

            # Acute safety distress marker trigger (<1.5% probability in high stress)
            has_acute_marker = bool(latent_stress > 0.82 and random.random() < 0.12)

            record = {
                "pseudonym_id": pseudonym_id,
                "force_type": ctx_config["context"],
                "unit_name": ctx_config["force_name"],
                "consecutive_days_deployed": consecutive_days,
                "rest_ratio_28d": round(rest_ratio_28d, 3),
                "leave_applied_12m": leave_applied,
                "leave_denied_12m": leave_denied,
                "leave_denial_ratio": round(leave_denial_ratio, 3),
                "days_since_leave_return": days_since_leave_return,
                "post_leave_hazard": round(post_leave_hazard, 3),
                "transfers_36m": transfers_36m,
                "family_colocated": family_colocated,
                "night_duty_hours_28d": round(night_duty_hours, 1),
                "duty_hour_variance_28d": round(duty_hour_variance, 1),
                "promotion_stagnation_yrs": round(promotion_stagnation_yrs, 1),
                "latent_stress_index": round(latent_stress, 4),
                "mood_avg_7d": round(float(mood_mean), 2),
                "sleep_hours_avg_7d": round(float(sleep_mean), 2),
                "journal_sentiment_avg": round(float(journal_sentiment), 3),
                "app_active": app_active,
                "has_acute_marker": has_acute_marker
            }
            records.append(record)
            
            # Register in Identity Broker (Z2 isolated mock)
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            rank = random.choice(RANKS)
            svc_no = f"CAPF-{random.randint(100000, 999999)}"
            IdentityBroker.register_personnel(RealIdentityProfile(
                pseudonym_id=pseudonym_id,
                service_number=svc_no,
                full_name=f"{first} {last}",
                rank=rank,
                unit=ctx_config["force_name"],
                blood_group=random.choice(["O+", "A+", "B+", "AB+", "O-", "B-"]),
                emergency_contact_phone=f"+91 98{random.randint(10000000, 99999999)}",
                emergency_contact_name=f"Family of {first} {last}",
                base_location=f"Sector HQ, {ctx_config['force_name'].split()[0]}"
            ))

        self.personnel_df = pd.DataFrame(records)
        self.pseudonym_index = {r["pseudonym_id"]: r for r in records}
        self._calculate_cohort_baselines()
        return self.personnel_df

    def get_personnel_by_pseudonym(self, pseudonym_id: str) -> dict:
        """O(1) dictionary retrieval for device risk-band queries."""
        if pseudonym_id in self.pseudonym_index:
            return self.pseudonym_index[pseudonym_id]
        if not self.personnel_df.empty:
            match = self.personnel_df[self.personnel_df["pseudonym_id"] == pseudonym_id]
            if not match.empty:
                rec = match.iloc[0].to_dict()
                self.pseudonym_index[pseudonym_id] = rec
                return rec
            # Fallback to random sample record for demonstration
            return self.personnel_df.iloc[0].to_dict()
        return {}

    def _calculate_cohort_baselines(self):
        """Calculates cohort-specific median and MAD for unit-relative calibration."""
        for ctx in self.personnel_df["force_type"].unique():
            subset = self.personnel_df[self.personnel_df["force_type"] == ctx]["latent_stress_index"]
            median = float(subset.median())
            mad = float(np.median(np.abs(subset - median)))
            self.cohort_stats[ctx] = {
                "median": median,
                "mad": max(0.04, mad),
                "count": len(subset)
            }

cohort_manager = SyntheticCohortManager()
