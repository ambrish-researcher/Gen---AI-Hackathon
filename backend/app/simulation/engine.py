import math
import time
import uuid
from datetime import datetime, timezone, timedelta
from app.domain.models import Evidence, Task
from app.domain.warehouse import Warehouse
from app.planning.astar import astar
from app.evidence.reconcile import reconcile

ACTIVE = {"ready", "running", "paused"}


def now():
    return datetime.now(timezone.utc).isoformat()


class Mission:
    def __init__(
        self, task: Task, scenario="clear", speed=2.4, policy="praxis", memory=None
    ):
        self.id = str(uuid.uuid4())
        self.task, self.scenario, self.policy = task, scenario, policy
        self.world = Warehouse()
        self.speed_limit = speed
        self.position = [2.0, 12.0]
        self.cell = (2, 12)
        self.heading = 0.0
        self.velocity = 0.0
        self.inventory = {name: 2 for name in self.world.stations if name != "Charge"}
        self.cargo = 0
        self.delivered: dict[str, int] = {}
        self.action_index = 0
        self.path: list[tuple[int, int]] = []
        self.executed = [self.cell]
        self.dynamic: set[tuple[int, int]] = (
            {(9, 8)} if scenario == "conflict" else set()
        )
        self.known = set(self.dynamic) if policy == "praxis" else set()
        self.elapsed = 0.0
        self.distance = 0.0
        self.replans = 0
        self.collisions = 0
        self.prevented = 0
        self.action_time = 0.0
        self.status = "ready"
        self.verified = False
        self.error: str | None = None
        self.events: list[dict] = []
        self.evidence: list[Evidence] = []
        self.memory_ids = []
        self.saved = False
        self.decision_ms = 0.0
        self.event("understanding", task.parser)
        self.event(
            "grounding", f"{len(task.actions)} grounded actions in {self.world.id}"
        )
        if scenario == "conflict":
            self.observe("sample operational record", "9,8", "clear", now_old=True)
            self.observe("sensor", "9,8", "blocked")
        self.conflicts = reconcile(self.evidence)
        for c in self.conflicts:
            self.event("contradiction", c["reason"])
        if policy == "praxis":
            for row in memory or []:
                if (
                    row["valid"]
                    and row.get("verified")
                    and row.get("environment_id") == self.world.id
                    and row.get("scenario") == scenario
                ):
                    if (
                        datetime.now(timezone.utc)
                        - datetime.fromisoformat(row["created_at"])
                    ).total_seconds() < 86400:
                        self.memory_ids.append(row["id"])
                        for p in row.get("obstacles", []):
                            if tuple(p) in self.dynamic:
                                self.known.add(tuple(p))
            if self.memory_ids:
                self.event(
                    "memory",
                    f"Retrieved {len(self.memory_ids)} verified outcomes; obstacle claims revalidated against current state",
                )
        self.validate_graph()
        self.plan()
        self.event(
            "validation",
            "Plan preview ready. Collision and restricted-area checks are mandatory.",
        )

    def event(self, kind, message):
        self.events.append(
            {
                "seq": len(self.events),
                "time": round(self.elapsed, 3),
                "timestamp": now(),
                "kind": kind,
                "message": message,
                "position": list(self.position),
            }
        )

    def observe(self, source, entity, claim, now_old=False):
        self.evidence.append(
            Evidence(
                id=str(uuid.uuid4()),
                source=source,
                entity=entity,
                claim=claim,
                observed_at=(
                    (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
                    if now_old
                    else now()
                ),
                retrieved_at=now(),
                reliability=0.6 if now_old else 0.99,
                provenance=(
                    "Bundled synthetic warehouse fixture; not Zetaris"
                    if now_old
                    else "Authoritative occupancy sensor, warehouse-v1"
                ),
                mission_id=self.id,
            )
        )

    def validate_graph(self):
        position = self.cell
        cargo = 0
        inventory = self.inventory.copy()
        route = []
        for action in self.task.actions:
            target = self.world.stations[action.station]
            if action.kind == "navigate":
                segment = astar(position, target, self.blocked())
                route.extend(segment[1:])
                position = target
            else:
                if position != target:
                    raise ValueError("Task graph action is not grounded at its station")
                if action.kind == "pickup":
                    if inventory.get(action.station, 0) < action.quantity:
                        raise ValueError("Not enough packages at pickup station")
                    inventory[action.station] -= action.quantity
                    cargo += action.quantity
                if action.kind == "deliver":
                    cargo -= action.quantity
                if not 0 <= cargo <= 2:
                    raise ValueError("Task graph violates cargo capacity")
        self.preview_path = route

    def blocked(self):
        return (
            self.world.blocked()
            | self.known
            | (
                self.world.corridor_b
                if "Avoid Corridor B" in self.task.constraints
                else set()
            )
        )

    def plan(self):
        if self.action_index >= len(self.task.actions):
            return
        action = self.task.actions[self.action_index]
        start = time.perf_counter()
        if action.kind == "navigate":
            self.path = astar(
                self.cell, self.world.stations[action.station], self.blocked()
            )[1:]
            self.event(
                "planning",
                f"Route to {action.station}: {len(self.path)} cells; A* with mandatory restricted zones",
            )
        else:
            self.path = []
        self.decision_ms += (time.perf_counter() - start) * 1000

    def start(self):
        if self.status not in {"ready", "paused"}:
            raise ValueError("Only a ready or paused mission can start")
        self.status = "running"
        self.event("execution", "Simulation started; fixed-step kinematic controller")

    def pause(self):
        if self.status != "running":
            raise ValueError("Mission is not running")
        self.status = "paused"
        self.velocity = 0
        self.event("pause", "Execution paused")

    def stop(self):
        if self.status not in ACTIVE:
            raise ValueError("Mission is already terminal")
        self.status = "stopped"
        self.velocity = 0
        self.event("stop", "Emergency stop; outcome not promoted to verified memory")

    def fail(self, message):
        self.status = "failed"
        self.error = message
        self.velocity = 0
        self.event("failure", message)

    def add_obstacle(self, p):
        if p in self.world.blocked() or p in self.world.stations.values():
            raise ValueError("Choose an empty floor cell, away from stations")
        if math.dist(p, self.position) < 1.1:
            raise ValueError("Obstacle insertion overlaps the robot safety envelope")
        self.dynamic.add(p)
        self.observe("sensor", f"{p[0]},{p[1]}", "blocked")
        self.conflicts = reconcile(self.evidence)
        self.event(
            "obstacle", f"Sensor reports obstacle at {p}; route invalidated if affected"
        )
        if self.policy == "praxis":
            self.known.add(p)
            if p in self.path or (self.status == "ready" and p in self.preview_path):
                self.replan()
                if self.status == "ready":
                    try:
                        self.validate_graph()
                    except ValueError as e:
                        self.fail(str(e))

    def replan(self):
        self.position = list(map(float, self.cell))
        self.velocity = 0
        self.replans += 1
        self.event(
            "replanning",
            "Changed route because sensor occupancy invalidated the previous path",
        )
        try:
            self.plan()
        except ValueError as e:
            self.fail(str(e))

    def tick(self, dt=0.05):
        if self.status != "running":
            return
        self.elapsed += dt
        if self.elapsed > 300:
            self.fail("Mission timeout (300 simulated seconds)")
            return
        if self.action_index >= len(self.task.actions):
            self.finish()
            return
        a = self.task.actions[self.action_index]
        if a.kind == "navigate" and self.path:
            target = self.path[0]
            if target in self.world.blocked() | self.dynamic:
                self.prevented += 1
                self.observe("sensor", f"{target[0]},{target[1]}", "blocked")
                if self.policy == "static":
                    self.fail("Static planner safely stopped at unmodeled obstacle")
                    return
                self.known.add(target)
                self.replan()
                return
            dx, dy = target[0] - self.position[0], target[1] - self.position[1]
            remaining = math.hypot(dx, dy)
            desired = min(self.speed_limit, math.sqrt(2 * 3 * remaining))
            self.velocity = min(desired, self.velocity + 3 * dt)
            step = min(remaining, self.velocity * dt)
            if remaining > 1e-9:
                self.position[0] += dx / remaining * step
                self.position[1] += dy / remaining * step
                self.heading = math.atan2(dx, dy)
            self.distance += step
            if remaining - step < 1e-6:
                self.cell = target
                self.position = list(map(float, target))
                self.executed.append(target)
                self.path.pop(0)
            return
        self.velocity = 0
        if a.kind != "navigate":
            self.action_time += dt
            if self.action_time < 0.6:
                return
            if self.cell != self.world.stations[a.station]:
                self.fail("Action station precondition failed")
                return
            if a.kind == "pickup":
                if self.cargo + a.quantity > 2:
                    self.fail("Capacity exceeded")
                    return
                if self.inventory.get(a.station, 0) < a.quantity:
                    self.fail("Pickup inventory unavailable")
                    return
                self.inventory[a.station] -= a.quantity
                self.cargo += a.quantity
            elif a.kind == "deliver":
                if self.cargo < a.quantity:
                    self.fail("No package available for delivery")
                    return
                self.inventory[a.station] = (
                    self.inventory.get(a.station, 0) + a.quantity
                )
                self.cargo -= a.quantity
                self.delivered[a.station] = (
                    self.delivered.get(a.station, 0) + a.quantity
                )
            elif a.kind == "inspect":
                self.observe("sensor", f"station:{a.station}", "clear")
        self.event(
            a.kind,
            f"{a.kind.capitalize()} at {a.station}"
            + (f" · {a.quantity} package(s)" if a.quantity else ""),
        )
        self.action_time = 0
        self.action_index += 1
        if self.action_index == len(self.task.actions):
            self.finish()
        else:
            try:
                self.plan()
            except ValueError as e:
                self.fail(str(e))

    def finish(self):
        expected = {}
        for a in self.task.actions:
            if a.kind == "deliver":
                expected[a.station] = expected.get(a.station, 0) + a.quantity
        last = self.task.actions[-1]
        self.verified = (
            self.cell == self.world.stations[last.station]
            and self.delivered == expected
            and self.collisions == 0
            and self.action_index == len(self.task.actions)
        )
        self.status = "completed" if self.verified else "failed"
        self.velocity = 0
        self.event(
            "verification",
            (
                "PASS: final station, action completion, delivery quantities and collision invariants verified"
                if self.verified
                else "FAIL: objective verification failed"
            ),
        )

    def snapshot(self):
        return {
            "id": self.id,
            "task": self.task.model_dump(),
            "scenario": self.scenario,
            "status": self.status,
            "position": self.position[:],
            "heading": self.heading,
            "velocity": self.velocity,
            "cargo": self.cargo,
            "inventory": self.inventory.copy(),
            "delivered": self.delivered.copy(),
            "action_index": self.action_index,
            "path": [
                list(p)
                for p in (self.preview_path if self.status == "ready" else self.path)
            ],
            "executed": [list(p) for p in self.executed],
            "obstacles": [list(p) for p in sorted(self.dynamic)],
            "evidence": [e.model_dump() for e in self.evidence],
            "conflicts": self.conflicts,
            "events": self.events[:],
            "verified": self.verified,
            "error": self.error,
            "memory_ids": self.memory_ids,
            "metrics": {
                "time": round(self.elapsed, 2),
                "distance": round(self.distance, 2),
                "replans": self.replans,
                "collisions": self.collisions,
                "prevented": self.prevented,
                "decision_ms": round(self.decision_ms, 3),
            },
        }
