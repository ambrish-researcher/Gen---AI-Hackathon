from typing import Literal
from pydantic import BaseModel, Field

Point = tuple[int, int]


class MissionRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    scenario: Literal["clear", "conflict", "restricted"] = "conflict"
    speed: float = Field(default=2.4, ge=0.5, le=4)


class Action(BaseModel):
    kind: Literal["navigate", "pickup", "deliver", "inspect"]
    station: str
    quantity: int = Field(default=0, ge=0, le=2)


class Task(BaseModel):
    intent: Literal["navigate", "pickup", "deliver", "inspect"]
    objective: str
    source: str | None = None
    destinations: list[str]
    constraints: list[str] = Field(
        default_factory=lambda: ["Avoid restricted cells", "Refuse collisions"]
    )
    actions: list[Action]
    parser: str = "LOCAL / constrained grammar (no AI inference)"
    environment_id: str = "warehouse-v1"


class Evidence(BaseModel):
    id: str
    source: str
    entity: str
    claim: Literal["clear", "blocked"]
    observed_at: str
    retrieved_at: str
    reliability: float
    provenance: str
    validation_status: str = "observed"
    mission_id: str | None = None


class ObstacleRequest(BaseModel):
    x: int = Field(ge=0, lt=20)
    y: int = Field(ge=0, lt=16)


class ExperimentRequest(BaseModel):
    seed: int = Field(default=42, ge=0, le=1000000)
    trials: int = Field(default=5, ge=1, le=20)
    scenario: Literal[
        "clear", "unexpected", "conflict", "restricted", "multiple", "memory"
    ] = "unexpected"
