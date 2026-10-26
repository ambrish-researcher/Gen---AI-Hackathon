import pytest
from fastapi.testclient import TestClient
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path}/api.db")
    with TestClient(app) as c:
        yield c, app.state.runtime


def test_health_world_and_errors(client):
    c, _ = client
    assert c.get("/api/health").json()["data_mode"] == "SAMPLE"
    assert len(c.get("/api/world").json()["stations"]) == 6
    assert c.post("/api/control/start").status_code == 404
    assert (
        c.post("/api/missions", json={"prompt": "Fly to Station C"}).status_code == 422
    )
    assert (
        c.post(
            "/api/missions", json={"prompt": "Navigate to Station B", "speed": 100}
        ).status_code
        == 422
    )


def test_full_lifecycle_memory_and_history(client):
    c, r = client
    assert (
        c.post(
            "/api/missions", json={"prompt": "Deliver from Station A to Station D"}
        ).status_code
        == 201
    )
    assert c.get("/api/state").json()["status"] == "ready"
    assert c.post("/api/control/start").status_code == 200
    assert (
        c.post("/api/missions", json={"prompt": "Navigate to Station B"}).status_code
        == 409
    )
    c.post("/api/control/pause")
    assert r.mission.status == "paused"
    c.post("/api/control/start")
    while r.mission.status == "running":
        r.mission.tick()
    r.persist()
    assert c.get("/api/state").json()["verified"]
    rows = c.get("/api/memory").json()
    assert len(rows) == 1 and rows[0]["verified"]
    assert c.get("/api/history").json()[0]["status"] == "completed"
    assert c.get("/api/explanation").json()["decisions"][-1]["kind"] == "verification"
    c.delete("/api/memory/" + rows[0]["id"])
    assert not c.get("/api/memory").json()[0]["valid"]
    c.post("/api/control/reset")
    assert c.get("/api/state").json() is None


def test_obstacle_and_stop_not_promoted(client):
    c, r = client
    c.post("/api/missions", json={"prompt": "Navigate to Station C"})
    p = r.mission.path[4]
    assert (
        c.post("/api/obstacles", json={"x": p[0], "y": p[1]}).json()["metrics"][
            "replans"
        ]
        == 1
    )
    assert c.post("/api/obstacles", json={"x": 20, "y": 2}).status_code == 422
    c.post("/api/control/stop")
    assert c.get("/api/memory").json() == []


def test_websocket_state(client):
    c, _ = client
    with c.websocket_connect("/api/stream") as ws:
        assert ws.receive_json() is None
    c.post("/api/missions", json={"prompt": "Navigate to Station B"})
    with c.websocket_connect("/api/stream") as ws:
        assert ws.receive_json()["status"] == "ready"


def test_experiment_and_integration_truth(client):
    c, _ = client
    r = c.post(
        "/api/experiments", json={"seed": 42, "trials": 2, "scenario": "unexpected"}
    )
    assert r.status_code == 201 and len(r.json()["results"]) == 8
    assert len(c.get("/api/experiments").json()) == 1
    assert len(c.get("/api/skills").json()) == 1
    assert all(
        i["status"] == "UNAVAILABLE" and i["last_success"] is None
        for i in c.get("/api/integrations").json()
    )
