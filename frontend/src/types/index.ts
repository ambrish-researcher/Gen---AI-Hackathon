export type Point = [number, number];
export type Task = {
  intent: string;
  objective: string;
  source: string | null;
  destinations: string[];
  constraints: string[];
  actions: { kind: string; station: string; quantity: number }[];
  parser: string;
  environment_id: string;
};
export type Evidence = {
  id: string;
  source: string;
  entity: string;
  claim: string;
  observed_at: string;
  retrieved_at: string;
  provenance: string;
  reliability: number;
  validation_status: string;
};
export type MissionEvent = {
  seq: number;
  time: number;
  timestamp: string;
  kind: string;
  message: string;
  position: number[];
};
export type Metrics = {
  time: number;
  distance: number;
  replans: number;
  collisions: number;
  prevented: number;
  decision_ms: number;
};
export type Conflict = {
  entity: string;
  evidence_ids: string[];
  selected: string;
  resolution: string;
  reason: string;
};
export type Mission = {
  id: string;
  task: Task;
  scenario: string;
  status: string;
  position: Point;
  heading: number;
  velocity: number;
  cargo: number;
  delivered: Record<string, number>;
  action_index: number;
  path: Point[];
  executed: Point[];
  obstacles: Point[];
  evidence: Evidence[];
  conflicts: Conflict[];
  events: MissionEvent[];
  verified: boolean;
  error: string | null;
  memory_ids: string[];
  metrics: Metrics;
};
export type World = {
  id: string;
  width: number;
  height: number;
  stations: Record<string, Point>;
  shelves: Point[];
  restricted: Point[];
  corridor_b: Point[];
};
export type Memory = {
  id: string;
  created_at: string;
  valid: boolean;
  verified: boolean;
  objective: string;
  environment_id: string;
  scenario: string;
  outcome: Metrics;
  trace: Point[];
};
export type Integration = {
  id: string;
  name: string;
  status: string;
  detail: string;
  configured_names: string[];
  last_success: string | null;
  latency_ms: number | null;
};
export type Trial = {
  trial: number;
  controller: string;
  prompt: string;
  verified: boolean;
  failure: string | null;
  metrics: Metrics;
  trace: Point[];
  events: MissionEvent[];
  obstacles: Point[];
  memory_reuses: number;
};
export type Experiment = {
  id: string;
  config: { seed: number; trials: number; scenario: string };
  summary: ({
    controller: string;
    success_rate: number;
    memory_reuses: number;
  } & Metrics)[];
  results: Trial[];
  candidate_retained: boolean;
  retention_reason: string;
  wall_ms: number;
  scope: string;
};
