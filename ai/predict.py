"""Read feature rows from stdin JSON and print predicted match scores."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np

FEATURE_NAMES = [
    "distance_km",
    "skill_score",
    "rating_norm",
    "available",
    "is_emergency",
    "completed_jobs",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "match_ranker.joblib",
    )
    args = parser.parse_args()

    payload = json.load(sys.stdin)
    instances = payload.get("instances") or []
    bundle = joblib.load(args.model)
    model = bundle["model"]

    rows = []
    for item in instances:
        rows.append([float(item.get(name, 0.0)) for name in FEATURE_NAMES])

    if not rows:
        print(json.dumps({"scores": [], "feature_importances": bundle.get("metrics", {}).get("feature_importances")}))
        return

    scores = model.predict(np.array(rows, dtype=float))
    print(
        json.dumps(
            {
                "scores": [round(float(s), 2) for s in scores],
                "feature_importances": bundle.get("metrics", {}).get("feature_importances"),
            }
        )
    )


if __name__ == "__main__":
    main()
