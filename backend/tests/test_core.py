import math
import pytest
from app.agents.interpreter import interpret
from app.domain.warehouse import Warehouse
from app.domain.models import ExperimentRequest
from app.planning.astar import astar
from app.simulation.engine import Mission
from app.persistence.database import Database
from app.experiments.runner import run_experiment


def complete(m):
    m.start()
    for _ in range(6002):
        m.tick()
        assert m.cell not in m.world.blocked() | m.dynamic
        if m.status != "running":
            break
    return m


@pytest.mark.parametrize("dest", list(Warehouse.stations))
def test_pathfinding(dest):
    w = Warehouse()
    p = astar(w.stations["A"], w.stations[dest], w.blocked())
    assert p[0] == w.stations["A"] and p[-1] == w.stations[dest]
    assert not set(p) & w.blocked()
    assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(p, p[1:]))


def test_no_path():
    with pytest.raises(ValueError, match="No safe route"):
        astar((0, 0), (2, 2), {(1, 0), (0, 1)})


@pytest.mark.parametrize(
    "prompt",
    [
        "Fly to Station B",
        "Navigate to Station Z",
        "Do something",
        "Weld at Station A",
        "Pick up three packages at Station A",
        "Navigate to Station B avoid Corridor X",
    ],
)
def test_invalid_tasks(prompt):
    with pytest.raises(ValueError):
        interpret(prompt)


@pytest.mark.parametrize("dest", ["B", "C", "D"])
def test_distinct_navigation(dest):
    m = complete(Mission(interpret(f"Navigate from Station A to Station {dest}")))
    assert (
        m.verified
        and m.cell == Warehouse.stations[dest]
        and m.executed[-1] == Warehouse.stations[dest]
    )


def test_delivery_and_quantities():
    m = complete(
        Mission(
            interpret(
                "Deliver two packages from Station C to Station D and loading dock"
            )
        )
    )
    assert m.verified and m.delivered == {"D": 1, "Dock": 1} and m.cargo == 0
    assert any(e["kind"] == "pickup" for e in m.events)


def test_pickup_only():
    m = complete(Mission(interpret("Pick up two packages at Station C")))
    assert m.verified and m.cargo == 2 and not m.delivered


def test_restricted_corridor():
    m = complete(Mission(interpret("Navigate to Station C and avoid Corridor B")))
    assert m.verified and not set(m.executed) & Warehouse.corridor_b


def test_dynamic_replanning():
    m = Mission(interpret("Navigate to Station C"))
    original = m.path[:]
    obstacle = original[5]
    m.add_obstacle(obstacle)
    assert m.replans == 1 and obstacle not in m.path
    complete(m)
    assert m.verified and obstacle not in m.executed


def test_mid_edge_replanning_is_safe():
    m = Mission(interpret("Navigate to Station C"))
    m.start()
    m.tick(0.1)
    m.add_obstacle(m.path[5])
    assert tuple(m.position) == m.cell
    while m.status == "running":
        m.tick()
    assert m.verified


def test_collision_refusal():
    m = Mission(interpret("Navigate to Station C"), policy="static")
    m.dynamic.add(m.path[2])
    complete(m)
    assert m.status == "failed" and m.prevented == 1 and m.collisions == 0


def test_conflict_freshness():
    m = Mission(interpret("Navigate to Station C"), scenario="conflict")
    assert len(m.conflicts) == 1
    assert m.conflicts[0]["selected"] == m.evidence[1].id
    assert m.evidence[0].observed_at < m.evidence[1].observed_at
    assert (9, 8) not in m.path
    assert complete(m).verified


def test_pause_resume_stop():
    m = Mission(interpret("Navigate to Station C"))
    m.start()
    m.tick()
    m.pause()
    pos = m.position[:]
    m.tick()
    assert pos == m.position
    m.start()
    m.tick()
    m.stop()
    pos = m.position[:]
    m.tick()
    assert pos == m.position and not m.verified
    with pytest.raises(ValueError):
        m.start()


def test_obstacle_envelope():
    m = Mission(interpret("Navigate to Station C"))
    with pytest.raises(ValueError):
        m.add_obstacle((2, 12))
    with pytest.raises(ValueError):
        m.add_obstacle((5, 3))


def test_database_persistence_and_invalidation(tmp_path):
    url = f"sqlite:///{tmp_path}/test.db"
    db = Database(url)
    db.put("a", "memory", {"verified": True})
    db.engine.dispose()
    second = Database(url)
    assert second.list("memory")[0]["verified"]
    second.invalidate("a")
    assert not second.list("memory")[0]["valid"]


def test_memory_revalidation(tmp_path):
    db = Database(f"sqlite:///{tmp_path}/test.db")
    db.put(
        "valid",
        "memory",
        {
            "verified": True,
            "environment_id": "warehouse-v1",
            "scenario": "conflict",
            "obstacles": [[9, 8], [4, 4]],
        },
    )
    db.put(
        "invalid",
        "memory",
        {
            "verified": True,
            "environment_id": "warehouse-v1",
            "scenario": "conflict",
            "obstacles": [[4, 4]],
        },
    )
    db.invalidate("invalid")
    m = Mission(
        interpret("Navigate to Station C"), "conflict", memory=db.list("memory")
    )
    assert m.memory_ids == ["valid"] and (4, 4) not in m.known


@pytest.mark.parametrize(
    "scenario", ["clear", "unexpected", "conflict", "restricted", "multiple", "memory"]
)
def test_experiments_reproducible(scenario):
    request = ExperimentRequest(seed=8, trials=2, scenario=scenario)
    a = run_experiment(request)
    b = run_experiment(request)
    assert len(a["results"]) == 8
    for ra, rb in zip(a["results"], b["results"]):
        assert ra["trace"] == rb["trace"] and ra["verified"] == rb["verified"]
        assert ra["metrics"]["time"] == rb["metrics"]["time"]
        assert ra["metrics"]["collisions"] == 0
    assert math.isfinite(a["wall_ms"])
    if scenario == "unexpected":
        assert (
            a["summary"][0]["success_rate"] == 0
            and a["summary"][2]["success_rate"] == 1
        )
        assert a["candidate_retained"]


@pytest.mark.parametrize(
    "prompt",
    [
        "Do not navigate to Station C",
        "Navigate to Station C then send email",
        "Navigate to Station C via Station B",
        "Navigate to Station C and avoid Station B",
    ],
)
def test_parser_never_discards_unknown_clauses(prompt):
    with pytest.raises(ValueError):
        interpret(prompt)


def test_inventory_preconditions_and_inspection():
    with pytest.raises(ValueError, match="packages"):
        Mission(interpret("Pick up a package at charging station"))
    m = complete(Mission(interpret("Inspect Station B")))
    assert m.verified and any(e.entity == "station:B" for e in m.evidence)
    m = complete(Mission(interpret("Deliver two packages from Station C to Station D")))
    assert m.inventory["C"] == 0 and m.inventory["D"] == 4


def test_full_route_preview_before_execution():
    m = Mission(interpret("Deliver the package from Station A to Station D"))
    assert m.snapshot()["path"][-1] == list(Warehouse.stations["D"])
    assert m.status == "ready" and m.position == [2.0, 12.0]
