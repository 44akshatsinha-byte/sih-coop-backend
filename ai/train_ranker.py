"""
Train a RandomForestRegressor that predicts match quality (0–100).

Labels are generated from the same explainable formula the Node API uses,
plus a small interaction term and noise so the forest can learn emergency ×
distance effects instead of only linear weights.

Usage:
  python3 ai/train_ranker.py
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURE_NAMES = [
    "distance_km",
    "skill_score",
    "rating_norm",
    "available",
    "is_emergency",
    "completed_jobs",
]

WEIGHTS = {"distance": 0.35, "skill": 0.30, "rating": 0.20, "availability": 0.15}
MAX_KM_NORMAL = 25.0
MAX_KM_EMERGENCY = 15.0
URGENCY_BONUS_MAX = 15.0
NEW_WORKER_PRIOR = 0.70


def distance_score(km: np.ndarray, is_emergency: np.ndarray) -> np.ndarray:
    max_km = np.where(is_emergency == 1, MAX_KM_EMERGENCY, MAX_KM_NORMAL)
    return np.clip(1.0 - km / max_km, 0.0, 1.0)


def formula_score(X: np.ndarray) -> np.ndarray:
    km, skill, rating, available, emergency, _jobs = X.T
    d = distance_score(km, emergency)
    base = 100.0 * (
        WEIGHTS["distance"] * d
        + WEIGHTS["skill"] * skill
        + WEIGHTS["rating"] * rating
        + WEIGHTS["availability"] * available
    )
    bonus = np.where(emergency == 1, URGENCY_BONUS_MAX * d, 0.0)
    return np.clip(base + bonus, 0.0, 100.0)


def generate_synthetic(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    distance_km = rng.uniform(0.2, 40.0, size=n)
    skill_score = rng.beta(2.2, 1.4, size=n)
    rating_norm = rng.choice(
        [NEW_WORKER_PRIOR, *rng.uniform(0.5, 1.0, size=max(n, 1))],
        size=n,
    )
    rating_norm = np.clip(rating_norm, 0.0, 1.0)
    available = rng.binomial(1, 0.82, size=n).astype(float)
    is_emergency = rng.binomial(1, 0.22, size=n).astype(float)
    completed_jobs = rng.integers(0, 180, size=n).astype(float)

    X = np.column_stack(
        [distance_km, skill_score, rating_norm, available, is_emergency, completed_jobs]
    )
    y = formula_score(X)
    # Interaction the linear formula understates: experienced nearby workers on emergencies.
    y = y + is_emergency * (1.0 - np.clip(distance_km / 10.0, 0.0, 1.0)) * 4.0
    y = y + np.clip(np.log1p(completed_jobs) * 0.35, 0.0, 4.0)
    y = np.clip(y + rng.normal(0.0, 2.2, size=n), 0.0, 100.0)
    return X, y


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=8000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "match_ranker.joblib",
    )
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    X, y = generate_synthetic(args.n, rng)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=args.seed
    )

    model = RandomForestRegressor(
        n_estimators=180,
        max_depth=12,
        min_samples_leaf=4,
        random_state=args.seed,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    metrics = {
        "r2": round(float(r2_score(y_test, pred)), 4),
        "mae": round(float(mean_absolute_error(y_test, pred)), 4),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "feature_importances": {
            name: round(float(imp), 4)
            for name, imp in zip(FEATURE_NAMES, model.feature_importances_)
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_names": FEATURE_NAMES, "metrics": metrics}, args.out)

    metrics_path = args.out.with_suffix(".metrics.json")
    metrics_path.write_text(json.dumps(metrics, indent=2))
    print(json.dumps({"saved": str(args.out), **metrics}, indent=2))


if __name__ == "__main__":
    main()
