"""Run with PYTHONPATH=backend /workspace/praxis-venv/bin/python scripts/benchmark.py."""

import json
from pathlib import Path
from app.domain.models import ExperimentRequest
from app.experiments.runner import run_experiment

out = Path("experiments")
for scenario in ["clear", "unexpected", "conflict", "restricted", "multiple", "memory"]:
    result = run_experiment(ExperimentRequest(seed=42, trials=5, scenario=scenario))
    (out / f"{scenario}-seed42.json").write_text(json.dumps(result, indent=2) + "\n")
    print(scenario, result["wall_ms"], "ms", result["summary"])
