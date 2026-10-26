import asyncio
import contextlib
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.agents.interpreter import interpret
from app.domain.models import MissionRequest, ObstacleRequest, ExperimentRequest
from app.domain.warehouse import Warehouse
from app.simulation.engine import Mission, ACTIVE
from app.persistence.database import Database
from app.experiments.runner import run_experiment
from app.integrations.diagnostics import diagnostics

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("praxis")


class Runtime:
    def __init__(self, db):
        self.db = db
        self.mission = None

    def persist(self):
        m = self.mission
        if m and m.status not in ACTIVE and not m.saved:
            snapshot = m.snapshot()
            self.db.put(m.id, "mission", snapshot)
            if m.verified:
                self.db.put(
                    m.id + "-memory",
                    "memory",
                    {
                        "verified": True,
                        "environment_id": m.world.id,
                        "scenario": m.scenario,
                        "objective": m.task.objective,
                        "controller": "kinematic-v1",
                        "evidence": snapshot["evidence"],
                        "plan": snapshot["task"]["actions"],
                        "trace": snapshot["executed"],
                        "outcome": snapshot["metrics"],
                        "obstacles": snapshot["obstacles"],
                    },
                )
            m.saved = True
            log.info(
                json.dumps(
                    {
                        "event": "mission_terminal",
                        "id": m.id,
                        "status": m.status,
                        "verified": m.verified,
                    }
                )
            )

    async def loop(self):
        while True:
            await asyncio.sleep(0.05)
            if self.mission:
                self.mission.tick(0.05)
                self.persist()


def create_app(db_url=None):
    if not db_url and not os.getenv("DATABASE_URL"):
        Path("/workspace/praxis-data").mkdir(parents=True, exist_ok=True)
    runtime = Runtime(Database(db_url))

    @asynccontextmanager
    async def lifespan(app):
        worker = asyncio.create_task(runtime.loop())
        yield
        worker.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await worker
        runtime.db.engine.dispose()

    app = FastAPI(title="PRAXIS", version="0.1.0", lifespan=lifespan)
    app.state.runtime = runtime
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )

    def mission():
        if not runtime.mission:
            raise HTTPException(404, "No mission selected")
        return runtime.mission

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "simulation": "deterministic",
            "inference": "local constrained grammar",
            "data_mode": "SAMPLE",
            "version": "0.1.0",
        }

    @app.get("/api/world")
    def world():
        return Warehouse().data()

    @app.get("/api/state")
    def state():
        return runtime.mission.snapshot() if runtime.mission else None

    @app.post("/api/missions", status_code=201)
    async def create(request: MissionRequest):
        if runtime.mission and runtime.mission.status in {"running", "paused"}:
            raise HTTPException(409, "Stop the active mission before planning another")
        try:
            task = interpret(request.prompt)
            runtime.mission = Mission(
                task, request.scenario, request.speed, memory=runtime.db.list("memory")
            )
        except ValueError as e:
            raise HTTPException(422, str(e))
        return runtime.mission.snapshot()

    @app.post("/api/control/{command}")
    async def control(command: str):
        m = mission()
        try:
            if command == "start":
                m.start()
            elif command == "pause":
                m.pause()
            elif command == "stop":
                m.stop()
            elif command == "reset":
                if m.status in ACTIVE:
                    m.stop()
                    runtime.persist()
                runtime.mission = None
                return None
            else:
                raise ValueError("Unknown control")
        except ValueError as e:
            raise HTTPException(409, str(e))
        runtime.persist()
        return m.snapshot()

    @app.post("/api/obstacles")
    async def obstacle(request: ObstacleRequest):
        m = mission()
        if m.status not in ACTIVE:
            raise HTTPException(
                409, "Plan a new mission before modifying the environment"
            )
        try:
            m.add_obstacle((request.x, request.y))
        except ValueError as e:
            raise HTTPException(422, str(e))
        runtime.persist()
        return m.snapshot()

    @app.get("/api/explanation")
    async def explanation():
        m = mission()
        return {
            "objective": m.task.objective,
            "parser": m.task.parser,
            "decisions": [
                e
                for e in m.events
                if e["kind"]
                in {
                    "planning",
                    "replanning",
                    "contradiction",
                    "verification",
                    "failure",
                    "memory",
                }
            ],
            "conflicts": m.conflicts,
            "constraints": m.task.constraints,
        }

    @app.get("/api/history")
    def history():
        return runtime.db.list("mission")

    @app.get("/api/memory")
    def memory():
        return runtime.db.list("memory")

    @app.delete("/api/memory/{id}")
    def invalidate(id: str):
        if not runtime.db.invalidate(id):
            raise HTTPException(404, "Memory not found")
        return {"invalidated": True}

    @app.get("/api/integrations")
    def integrations():
        return diagnostics()

    @app.post("/api/experiments", status_code=201)
    async def experiments(request: ExperimentRequest):
        result = await asyncio.to_thread(run_experiment, request)
        runtime.db.put(result["id"], "experiment", result)
        if result["candidate_retained"]:
            runtime.db.put(
                result["id"] + "-skill",
                "skill",
                {
                    "controller": "kinematic-v2",
                    "speed": 2.4,
                    "experiment_id": result["id"],
                    "scope": result["config"],
                },
            )
        return result

    @app.get("/api/experiments")
    def experiment_history():
        return runtime.db.list("experiment")

    @app.get("/api/skills")
    def skills():
        return runtime.db.list("skill")

    @app.websocket("/api/stream")
    async def stream(ws: WebSocket):
        await ws.accept()
        try:
            while True:
                await ws.send_json(
                    runtime.mission.snapshot() if runtime.mission else None
                )
                await asyncio.sleep(0.1)
        except (WebSocketDisconnect, RuntimeError):
            pass

    return app


app = create_app()
