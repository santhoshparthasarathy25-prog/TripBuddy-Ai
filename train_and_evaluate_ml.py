#!/usr/bin/env python3
"""Train and evaluate TripBuddy AI ML models and record metrics in the database."""
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.ml.models import run_all_ml_evaluations_and_persist

if __name__ == "__main__":
    results = run_all_ml_evaluations_and_persist()
    print(json.dumps(results, indent=2))
