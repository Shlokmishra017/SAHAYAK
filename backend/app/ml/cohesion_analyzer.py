"""Cohort-level unit climate anomaly detection (aggregates only, no individual profiling)."""

import numpy as np
import pandas as pd
from typing import Dict, List

class CohortCohesionAnalyzer:
    def __init__(self):
        self._cached_results: List[Dict] = []
        self._cached_df_len: int = -1

    def analyze_sub_units(self, personnel_df: pd.DataFrame) -> List[Dict]:
        if personnel_df.empty:
            return []

        if len(personnel_df) == self._cached_df_len and self._cached_results:
            return self._cached_results

        grouped = personnel_df.groupby("unit_name").agg({
            "leave_denial_ratio": "mean",
            "duty_hour_variance_28d": "mean",
            "consecutive_days_deployed": "mean",
            "promotion_stagnation_yrs": "mean",
            "latent_stress_index": "mean",
            "pseudonym_id": "count"
        }).reset_index()

        grouped.rename(columns={"pseudonym_id": "personnel_count"}, inplace=True)

        sub_unit_results = []
        for _, row in grouped.iterrows():
            unit = row["unit_name"]
            total = int(row["personnel_count"])

            # Split each unit into company-sized cells; the small outpost (n < 20)
            # exercises the k-anonymity suppression path in the commander view.
            coy_distributions = [
                {"name": f"{unit} - Alpha Coy", "pct": 0.40},
                {"name": f"{unit} - Bravo Coy", "pct": 0.35},
                {"name": f"{unit} - Charlie Coy", "pct": 0.20},
                {"name": f"{unit} - Detached Outpost (Small Platoon)", "pct": 0.05}  # Deliberately n < 20
            ]

            for coy in coy_distributions:
                coy_n = int(round(total * coy["pct"]))
                # Documented demo rule: Alpha companies with mean leave-denial
                # ratio above 0.22 raise a climate alert. Friction is a stated
                # composite (70% denial rate + 30% normalized duty variance),
                # computed on synthetic demo data, not a validated climate
                # instrument.
                is_anomaly = (coy["name"].endswith("Alpha Coy") and row["leave_denial_ratio"] > 0.22)

                variance_norm = min(float(row["duty_hour_variance_28d"]) / 30.0, 1.0)
                friction_score = float(np.clip(
                    0.7 * float(row["leave_denial_ratio"]) + 0.3 * variance_norm,
                    0.05, 0.95,
                ))
                
                sub_unit_results.append({
                    "sub_unit_name": coy["name"],
                    "parent_unit": unit,
                    "total_personnel": coy_n,
                    "leave_denial_rate": round(float(row["leave_denial_ratio"]), 2),
                    "duty_variance": round(float(row["duty_hour_variance_28d"]), 1),
                    "climate_friction_score": round(friction_score, 2),
                    "is_climate_alert": is_anomaly,
                    "anomaly_indicators": [
                        "Elevated Leave Denial Clustering",
                        "High Shift Rotation Inequity"
                    ] if is_anomaly else []
                })

        self._cached_results = sub_unit_results
        self._cached_df_len = len(personnel_df)
        return sub_unit_results

cohesion_analyzer = CohortCohesionAnalyzer()
