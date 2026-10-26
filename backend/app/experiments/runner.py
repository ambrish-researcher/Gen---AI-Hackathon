import random
import time
import uuid
from statistics import mean
from app.agents.interpreter import interpret
from app.domain.models import ExperimentRequest
from app.simulation.engine import Mission, now


def run_experiment(request: ExperimentRequest):
    start = time.perf_counter()
    rng = random.Random(request.seed)
    results = []
    for trial in range(request.trials):
        dest = rng.choice(["B", "C", "D"])
        prompt = f"Navigate to Station {dest}"
        if request.scenario == "multiple":
            prompt = "Deliver two packages from Station A to Station C and Station D"
        if request.scenario == "restricted":
            prompt += " and avoid Corridor B"
        scenario = "conflict" if request.scenario in {"conflict", "memory"} else "clear"
        task = interpret(prompt)
        reference = Mission(task, scenario)
        obstacle = (
            reference.path[max(1, len(reference.path) // 2)]
            if len(reference.path) > 3
            else None
        )
        for policy, speed, label in [
            ("static", 1.6, "A · static"),
            ("reactive", 1.6, "B · reactive"),
            ("praxis", 1.6, "PRAXIS"),
            ("praxis", 2.4, "PRAXIS · candidate v2"),
        ]:
            memory = []
            if request.scenario == "memory":
                prior = Mission(task, scenario)
                prior.start()
                while prior.status == "running":
                    prior.tick()
                memory = [
                    {
                        "id": prior.id,
                        "valid": True,
                        "verified": prior.verified,
                        "created_at": now(),
                        "environment_id": task.environment_id,
                        "scenario": scenario,
                        "obstacles": [list(p) for p in prior.dynamic],
                    }
                ]
            m = Mission(task, scenario, speed, policy, memory)
            m.start()
            if obstacle and request.scenario == "unexpected":
                m.add_obstacle(obstacle)
            while m.status == "running":
                m.tick()
            s = m.snapshot()
            results.append(
                {
                    "trial": trial,
                    "controller": label,
                    "prompt": prompt,
                    "verified": m.verified,
                    "failure": m.error,
                    "metrics": s["metrics"],
                    "trace": s["executed"],
                    "events": s["events"],
                    "obstacles": s["obstacles"],
                    "memory_reuses": len(m.memory_ids),
                }
            )
    summary = []
    for label in dict.fromkeys(r["controller"] for r in results):
        rows = [r for r in results if r["controller"] == label]
        summary.append(
            {
                "controller": label,
                "success_rate": mean(r["verified"] for r in rows),
                **{
                    k: round(mean(r["metrics"][k] for r in rows), 3)
                    for k in rows[0]["metrics"]
                },
                "memory_reuses": sum(r["memory_reuses"] for r in rows),
            }
        )
    base = next(r for r in summary if r["controller"] == "PRAXIS")
    candidate = summary[-1]
    retained = (
        candidate["success_rate"] >= base["success_rate"]
        and candidate["collisions"] == 0
        and candidate["time"] < base["time"]
        and candidate["success_rate"] == 1
    )
    return {
        "id": str(uuid.uuid4()),
        "config": request.model_dump(),
        "results": results,
        "summary": summary,
        "candidate_retained": retained,
        "retention_reason": "Retain only if all trials verify, zero collisions, no success regression and lower mean simulation time.",
        "wall_ms": round((time.perf_counter() - start) * 1000, 2),
        "scope": "Synthetic kinematic warehouse trials; not ASPIRE or real robot benchmarks.",
    }
