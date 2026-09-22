"""Synthetic longitudinal HR/wellness profiles across 4 deployment contexts.

DATA-GENERATING PROCESS (read before drawing conclusions from metrics):
- Feature distributions: deployment days ~ Normal(context mean, 25) clipped
  [0, 180]; rest ratio ~ Beta(5, 2 or 7); leave applications randint(2, 6) with
  context denial probability (+0.15 when deployed > 60 days); 40% have recent
  leave (days_since_leave_return 1-90, else 180); transfers randint(0, 4);
  family co-location Bernoulli (0.25 in field contexts, 0.65 otherwise);
  night duty ~ Normal(context mean, 20) clipped [10, 160]; duty variance ~
  Normal(15, 6) clipped [2, 40]; promotion stagnation ~ Exponential(4).
- Context assumptions: four illustrative operational contexts with different
  base stress means (0.32-0.58). These are synthetic archetypes, not measured
  unit data.
- Latent risk: context base (+ individual jitter) + contributions from a
  SUBSET of observable features (deployment length, leave-denial ratio, rest
  ratio, family co-location, night duty, post-leave hazard window 7-21 days)
  PLUS hidden factors the model cannot observe (random life-event shock,
  individual resilience trait) PLUS Gaussian noise (std 0.09). Observable-
  but-excluded features (duty-hour variance, promotion stagnation, transfer
  count outside reason rules, exact days-since-leave) carry little or no
  direct signal, so a model trained on all features must generalize instead
  of inverting the formula. This is still synthetic data: metrics on it are
  NOT real-world validation.
- Class imbalance is preserved: the review label (latent >= 0.65) is a
  minority class, as elevated welfare concern should be.
- Leakage avoidance: hidden factors and noise are never exposed as features;
  threshold selection must use the validation split only, never test.
"""

import numpy as np
import pandas as pd
import uuid
import random
from typing import Dict
from app.core.security import IdentityBroker, RealIdentityProfile

# Binary ground-truth definition for evaluation: latent stress at/above this
# value means the synthetic person "needs review". Fixed and documented; it is
# a property of the dataset, not a tuned parameter.
REVIEW_LABEL_THRESHOLD = 0.65

# Canonical demo persona identity — shared single source of truth across
# frontend context, backend identity registry, device risk band, and tests.
DEMO_PERSONNEL_PSEUDONYM = "f83a1290-7d1a-4c22-98ab-3011982bca81"
DEMO_PERSONNEL_SERVICE_NO = "CAPF-849201"
DEMO_PERSONNEL_NAME = "Vikram Singh"
DEMO_PERSONNEL_RANK = "Constable (GD)"
DEMO_PERSONNEL_UNIT = "CRPF 144 Bn (CI Ops)"


def add_review_label(df: pd.DataFrame, threshold: float = REVIEW_LABEL_THRESHOLD) -> pd.DataFrame:
    """Attach the binary evaluation label. Returns a copy; threshold fixed."""
    labeled = df.copy()
    labeled["needs_review"] = (labeled["latent_stress_index"] >= threshold).astype(int)
    return labeled

DEPLOYMENT_CONTEXTS = [
    {
        "context": "counter_insurgency",
        "force_name": "CRPF 144 Bn (CI Ops)",
        "base_stress_mean": 0.32,
        "base_stress_std": 0.15,
        "avg_deployment_days": 75,
        "leave_denial_prob": 0.28,
        "night_shift_mean": 85.0
    },
    {
        "context": "border_guarding",
        "force_name": "BSF 92 Bn (Forward Post)",
        "base_stress_mean": 0.29,
        "base_stress_std": 0.14,
        "avg_deployment_days": 90,
        "leave_denial_prob": 0.22,
        "night_shift_mean": 70.0
    },
    {
        "context": "public_order",
        "force_name": "RAF 108 Bn (Rapid Action)",
        "base_stress_mean": 0.24,
        "base_stress_std": 0.16,
        "avg_deployment_days": 35,
        "leave_denial_prob": 0.18,
        "night_shift_mean": 95.0
    },
    {
        "context": "static_guarding",
        "force_name": "CISF Plant Security Unit",
        "base_stress_mean": 0.18,
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
        records = []
        for i in range(n_samples):
            if i == 0:
                ctx_config = DEPLOYMENT_CONTEXTS[0]
                pseudonym_id = DEMO_PERSONNEL_PSEUDONYM
                _ = random.choice(DEPLOYMENT_CONTEXTS)
            else:
                ctx_config = random.choice(DEPLOYMENT_CONTEXTS)
                pseudonym_id = str(uuid.uuid4())

            consecutive_days = int(np.clip(np.random.normal(ctx_config["avg_deployment_days"], 25), 0, 180))
            rest_ratio_28d = float(np.clip(np.random.beta(5, 2 if consecutive_days < 45 else 7), 0.05, 0.95))

            leave_applied = random.randint(2, 6)
            denial_chance = ctx_config["leave_denial_prob"] + (0.15 if consecutive_days > 60 else 0.0)
            leave_denied = int(np.random.binomial(leave_applied, min(0.85, denial_chance)))
            leave_denial_ratio = float(leave_denied / leave_applied) if leave_applied > 0 else 0.0

            has_recent_leave = random.random() < 0.40
            days_since_leave_return = random.randint(1, 90) if has_recent_leave else 180

            # Post-leave hazard peaks around days 7-21 after return.
            if 7 <= days_since_leave_return <= 21:
                post_leave_hazard = np.exp(-((days_since_leave_return - 14) ** 2) / (2 * (5 ** 2))) * 0.35
            else:
                post_leave_hazard = 0.0

            transfers_36m = random.randint(0, 4)
            family_colocated = random.random() < (0.25 if ctx_config["context"] in ["counter_insurgency", "border_guarding"] else 0.65)
            
            night_duty_hours = float(np.clip(np.random.normal(ctx_config["night_shift_mean"], 20), 10, 160))
            duty_hour_variance = float(np.clip(np.random.normal(15, 6), 2, 40))
            promotion_stagnation_yrs = float(np.clip(np.random.exponential(4.0), 0.5, 16.0))

            # Latent risk: observable subset + HIDDEN factors + noise.
            # Hidden factors (life-event shock, resilience trait, individual
            # base jitter) are never exposed as model features, so the scoring
            # function below is NOT identical to what the model can learn.
            # Duty-hour variance, promotion stagnation, and transfer count are
            # observable but carry no direct latent signal (transfers matter
            # only via the operational reason rule + family separation).
            # Weights are sized so the review label (latent >= 0.65) stays a
            # minority class, as elevated welfare concern should be.
            life_event_shock = 0.18 if random.random() < 0.05 else 0.0
            resilience_trait = float(np.random.normal(0, 0.07))
            base_jitter = float(np.random.normal(0, ctx_config["base_stress_std"] * 0.6))
            latent_stress = (
                ctx_config["base_stress_mean"]
                + base_jitter
                + (consecutive_days / 180.0) * 0.18
                + (leave_denial_ratio * 0.22)
                + post_leave_hazard * 0.7
                + ((1.0 - rest_ratio_28d) * 0.14)
                + (0.06 if not family_colocated else -0.06)
                + (night_duty_hours / 160.0) * 0.10
                + life_event_shock
                - resilience_trait
                + np.random.normal(0, 0.09)
            )
            latent_stress = float(np.clip(latent_stress, 0.02, 0.98))

            # Higher stress -> lower mood, worse sleep, more negative journal sentiment.
            mood_mean = np.clip(5.0 - (latent_stress * 3.8), 1.0, 5.0)
            sleep_mean = np.clip(7.8 - (latent_stress * 3.6), 3.0, 8.5)
            journal_sentiment = np.clip(0.65 - (latent_stress * 1.3), -0.95, 0.95)

            # Stressed personnel stop reporting more often.
            reporting_compliance = np.clip(0.95 - (latent_stress * 0.40), 0.20, 0.98)
            app_active = random.random() < reporting_compliance

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

            if i == 0:
                first, last = "Vikram", "Singh"
                rank = DEMO_PERSONNEL_RANK
                svc_no = DEMO_PERSONNEL_SERVICE_NO
                _ = (random.choice(FIRST_NAMES), random.choice(LAST_NAMES), random.choice(RANKS), random.randint(100000, 999999))
            else:
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

    def get_personnel_by_pseudonym(self, pseudonym_id: str) -> dict | None:
        if pseudonym_id in self.pseudonym_index:
            return self.pseudonym_index[pseudonym_id]
        if not self.personnel_df.empty:
            match = self.personnel_df[self.personnel_df["pseudonym_id"] == pseudonym_id]
            if not match.empty:
                rec = match.iloc[0].to_dict()
                self.pseudonym_index[pseudonym_id] = rec
                return rec
            # Unknown IDs return None so callers emit 404. Never fall back to
            # another person's record.
            return None
        return None

    def _calculate_cohort_baselines(self):
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
