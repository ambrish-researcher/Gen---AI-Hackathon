import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Box,
  ChevronDown,
  Command,
  Database,
  FlaskConical,
  Layers3,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Square,
  Workflow,
  Zap,
  FileSearch,
  ScanLine,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { useStream } from "../hooks/useStream";
import { useStudio } from "../stores/studio";
import type { CameraMode } from "../stores/studio";
import type { Mission, World, Trial } from "../types";
import { Telemetry, Timeline } from "../components/Telemetry";
import {
  EvidenceView,
  IntelligenceView,
  MemoryView,
  ExperimentsView,
  ResearchView,
  SettingsView,
} from "../features/Workspaces";
const WarehouseScene = lazy(() => import("../scene/WarehouseScene"));
const workspaces = [
  { name: "Studio", icon: Box },
  { name: "Intelligence", icon: Workflow },
  { name: "Evidence", icon: FileSearch },
  { name: "Memory", icon: Database },
  { name: "Experiments", icon: FlaskConical },
  { name: "Research", icon: Activity },
  { name: "Settings", icon: Settings2 },
];
const examples = [
  "Navigate from Station A to Station C.",
  "Deliver two packages from Station A to Station C and Station D.",
  "Inspect Station B and avoid Corridor B.",
];
const initialPrompt =
  "Deliver the package from Station A to Station D. Avoid restricted areas, verify corridor conditions, and choose a safe route.";
export default function App() {
  useStream();
  const { mission, connected, camera, setCamera, quality, setQuality, fps } =
    useStudio();
  const [workspace, setWorkspace] = useState("Studio");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [scenario, setScenario] = useState("conflict");
  const [speed, setSpeed] = useState(2.4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Plan");
  const [present, setPresent] = useState(false);
  const [replay, setReplay] = useState<Trial | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const world = useQuery({
    queryKey: ["world"],
    queryFn: () => api<World>("/world"),
  });
  const skills = useQuery({
    queryKey: ["skills", workspace],
    queryFn: () =>
      api<{ id: string; speed: number; controller: string }[]>("/skills"),
  });
  const history = useQuery({
    queryKey: ["history", mission?.status],
    queryFn: () => api<Mission[]>("/history"),
  });
  useEffect(() => {
    if (!playing || !replay) return;
    const timer = setInterval(
      () =>
        setFrame((f) => {
          if (f >= replay.trace.length - 1) {
            setPlaying(false);
            return f;
          }
          return f + 1;
        }),
      125,
    );
    return () => clearInterval(timer);
  }, [playing, replay]);
  const action = async (path: string, body?: unknown) => {
    setBusy(true);
    setError("");
    try {
      const m = await api<Mission | null>(path, "POST", body);
      useStudio.getState().setMission(m);
      if (path === "/missions") setTab("Plan");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const isCommand =
    /^(explain why the robot changed direction|explain (this|the) mission|compare controllers|run experiments?|place an obstacle in front of the robot)[.!]?$/i.test(
      prompt.trim(),
    );
  const plan = () => {
    setReplay(null);
    if (/^explain/i.test(prompt) && isCommand) {
      if (!mission) {
        setError("Plan a mission before requesting an explanation.");
        return;
      }
      setWorkspace("Intelligence");
      return;
    }
    if (/^(compare|run experiment)/i.test(prompt) && isCommand) {
      setBusy(true);
      setError("");
      api("/experiments", "POST", {
        seed: 42,
        trials: 5,
        scenario: "unexpected",
      })
        .then(() => setWorkspace("Experiments"))
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
      return;
    }
    if (/^place an obstacle/i.test(prompt) && isCommand) {
      addObstacle();
      return;
    }
    void action("/missions", { prompt, scenario, speed });
  };
  const addObstacle = () => {
    const p = mission?.path.find(
      (p, i) =>
        i >= 2 &&
        !Object.values(world.data?.stations ?? {}).some(
          (s) => s[0] === p[0] && s[1] === p[1],
        ),
    );
    if (!p) {
      setError(
        "No suitable route cell. Start navigation or plan a longer route.",
      );
      return;
    }
    void action("/obstacles", { x: p[0], y: p[1] });
  };
  const replayMission: Mission | null = replay
    ? {
        id: "replay",
        task: {
          intent: "navigate",
          objective: replay.prompt,
          source: null,
          destinations: [],
          constraints: [],
          actions: [],
          parser: "Recorded experiment trace",
          environment_id: "warehouse-v1",
        },
        scenario: "replay",
        status: "replay",
        position: replay.trace[frame] ?? [2, 12],
        heading: 0,
        velocity: 0,
        cargo: 0,
        delivered: {},
        action_index: 0,
        path: replay.trace.slice(frame + 1),
        executed: replay.trace.slice(0, frame + 1),
        obstacles: replay.obstacles,
        evidence: [],
        conflicts: [],
        events: replay.events,
        verified: replay.verified,
        error: replay.failure,
        memory_ids: [],
        metrics: replay.metrics,
      }
    : null;
  const viewed = replayMission ?? mission;
  return (
    <div className={"app " + (present ? "presentation" : "")}>
      <header className="app-header">
        <a
          className="wordmark"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setWorkspace("Studio");
          }}
          aria-label="PRAXIS Studio"
        >
          <div className="brand-icon">
            <Layers3 size={23} />
          </div>
          PRAXIS
          <span className="brand-divider" />
          <small>ROBOTICS STUDIO</small>
        </a>
        <div className="header-center">
          <span className="project-dot" />
          Warehouse intelligence<span className="muted">/</span>
          <span className="version">v0.1</span>
        </div>
        <div className="header-right">
          <span className={"connection " + (connected ? "online" : "")}>
            <i />
            {connected ? "SIMULATOR ONLINE" : "CONNECTING"}
          </span>
          <button
            className="icon-button"
            onClick={() => {
              setPresent(!present);
              setCamera(present ? "Isometric" : "Presentation");
              setWorkspace("Studio");
            }}
            aria-label="Toggle presentation mode"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>
      <nav className="navigation" aria-label="Workspaces">
        {workspaces.map((w) => (
          <button
            key={w.name}
            onClick={() => setWorkspace(w.name)}
            className={workspace === w.name ? "selected" : ""}
          >
            <w.icon size={16} />
            {w.name}
            {w.name === "Evidence" && (mission?.conflicts.length ?? 0) > 0 && (
              <span className="nav-count">{mission?.conflicts.length}</span>
            )}
          </button>
        ))}
        <div className="nav-end">
          <span className="sample-dot" />
          LOCAL / SAMPLE MODE
        </div>
      </nav>
      {workspace === "Studio" ? (
        <>
          <div className="studio-title">
            <div>
              <div className="eyebrow">MISSION CONTROL / WAREHOUSE–01</div>
              <h1>
                From intent to action<span>.</span>
              </h1>
              <p>
                Describe the objective. Inspect the plan. Verify the outcome.
              </p>
            </div>
            <div className="studio-title-right">
              <span className="badge">
                <ShieldCheck size={12} />
                SAFETY GUARDS ACTIVE
              </span>
              <span className="muted">Deterministic simulation</span>
            </div>
          </div>
          <main className="studio-layout">
            <aside className="composer">
              <div className="panel-heading">
                <span>
                  <Command size={14} />
                  MISSION COMPOSER
                </span>
                <span className="tiny-index">01</span>
              </div>
              <div className="composer-body">
                <div className="row">
                  <span className="eyebrow">YOUR OBJECTIVE</span>
                  <span className="keyboard-hint">⌘ ↵</span>
                </div>
                <textarea
                  aria-label="Mission prompt"
                  value={prompt}
                  maxLength={2000}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") plan();
                  }}
                  placeholder="Describe a robotics task…"
                />
                <div className="capabilities">
                  <span>
                    <i />
                    Navigation
                  </span>
                  <span>
                    <i />
                    Pickup & delivery
                  </span>
                  <span>
                    <i />
                    Inspection
                  </span>
                </div>
                <button
                  className="button primary plan-button"
                  onClick={plan}
                  disabled={
                    busy ||
                    !connected ||
                    (!isCommand &&
                      !!mission &&
                      ["running", "paused"].includes(mission.status))
                  }
                >
                  <Zap size={16} />
                  {busy
                    ? "Processing…"
                    : isCommand
                      ? "Submit command"
                      : "Generate mission plan"}
                  <ArrowRight size={16} />
                </button>
                <p className="parser-disclosure">
                  LOCAL constrained parser · No AI inference
                </p>
                {error && (
                  <div className="error" role="alert">
                    <TriangleAlert size={16} />
                    <span>{error}</span>
                    <button
                      aria-label="Dismiss error"
                      onClick={() => setError("")}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
                <div className="section-label">TRY A MISSION</div>
                <div className="suggestions">
                  {examples.map((p, i) => (
                    <button key={p} onClick={() => setPrompt(p)}>
                      <span>0{i + 1}</span>
                      {p}
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
                <div className="divider" />
                <div className="section-label">ENVIRONMENT CONFIGURATION</div>
                <label className="field">
                  WORLD
                  <div className="static-select">
                    <Box size={14} />
                    Warehouse–01 <span>20 × 16 m</span>
                  </div>
                </label>
                <label className="field">
                  ROBOT
                  <div className="static-select">
                    <ScanLine size={14} />
                    PR–01 / Mobile carrier<span>2 pkg</span>
                  </div>
                </label>
                <label className="field">
                  SCENARIO
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  >
                    <option value="conflict">
                      Conflicting corridor evidence
                    </option>
                    <option value="clear">Clear warehouse</option>
                    <option value="restricted">Restricted warehouse</option>
                  </select>
                </label>
                <label className="field">
                  CONTROLLER SPEED <span>{speed.toFixed(1)} m/s</span>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                  />
                </label>
                {skills.data?.length ? (
                  <button
                    className="text-link"
                    onClick={() => setSpeed(skills.data![0].speed)}
                  >
                    Apply retained {skills.data[0].controller} ·{" "}
                    {skills.data[0].speed}m/s
                  </button>
                ) : null}
                <div className="guard-note">
                  <ShieldCheck size={16} />
                  <p>
                    Restricted zones and collision checks are always enforced.
                  </p>
                </div>
                {history.data && history.data.length > 0 && (
                  <details className="history">
                    <summary>
                      Mission history ({history.data.length})
                      <ChevronDown size={12} />
                    </summary>
                    {history.data.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setPrompt(h.task.objective)}
                      >
                        <span>{h.verified ? "✓" : "○"}</span>
                        {h.task.objective}
                      </button>
                    ))}
                  </details>
                )}
              </div>
            </aside>
            <section
              className="viewport-panel"
              aria-label="Warehouse simulation"
            >
              <div className="viewport-toolbar">
                <div>
                  <span className="live-dot" />
                  WAREHOUSE–01 <span className="toolbar-divider">/</span>
                  <small>DIGITAL TWIN</small>
                </div>
                <button
                  className="quality-button"
                  onClick={() => setQuality(!quality)}
                >
                  {quality ? "HIGH" : "LOW"} QUALITY <ChevronDown size={12} />
                </button>
              </div>
              <div className="scene">
                {world.data ? (
                  <Suspense
                    fallback={
                      <div className="scene-fallback">Loading renderer…</div>
                    }
                  >
                    <WarehouseScene world={world.data} mission={viewed} />
                  </Suspense>
                ) : (
                  <div className="scene-fallback">
                    {world.error
                      ? `Cannot load world: ${world.error.message}`
                      : "Connecting to simulation…"}
                  </div>
                )}
                <div className="scene-top-left">
                  <span className="scene-label">
                    {replay
                      ? "RECORDED TRACE"
                      : mission?.status === "running"
                        ? "MISSION IN PROGRESS"
                        : mission?.verified
                          ? "MISSION VERIFIED"
                          : "SIMULATION WORKSPACE"}
                  </span>
                  <small>
                    {replay
                      ? replay.controller
                      : "20 × 16 m · 1 m grid · warehouse-v1"}
                  </small>
                </div>
                <div className="scene-legend">
                  <span>
                    <i className="planned" />
                    Planned route
                  </span>
                  <span>
                    <i className="executed" />
                    Executed
                  </span>
                  <span>
                    <i className="restricted" />
                    Restricted
                  </span>
                </div>
                <div className="camera-controls" aria-label="Camera presets">
                  {(
                    [
                      "Isometric",
                      "Follow",
                      "Top down",
                      "Free",
                      "Inspect",
                      "Presentation",
                    ] as CameraMode[]
                  ).map((c) => (
                    <button
                      key={c}
                      className={camera === c ? "active" : ""}
                      onClick={() => setCamera(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <span className="fps">{fps || "—"} FPS · WebGL</span>
              </div>
              {replay ? (
                <div className="replay-controls">
                  <button
                    className="button"
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}Trace
                    replay
                  </button>
                  <input
                    aria-label="Replay frame"
                    type="range"
                    min={0}
                    max={replay.trace.length - 1}
                    value={frame}
                    onChange={(e) => setFrame(+e.target.value)}
                  />
                  <small>
                    {frame + 1}/{replay.trace.length} · 8 cells/s
                  </small>
                  <button
                    className="icon-button"
                    aria-label="Exit replay"
                    onClick={() => {
                      setReplay(null);
                      setPlaying(false);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="mission-controls">
                  <div className="status-block">
                    <span className={"status-dot " + mission?.status} />
                    <div>
                      <strong>{mission?.status ?? "Standby"}</strong>
                      <small>
                        {mission
                          ? `${Math.min(mission.action_index, mission.task.actions.length)} / ${mission.task.actions.length} actions`
                          : "No mission loaded"}
                      </small>
                    </div>
                  </div>
                  <div className="control-buttons">
                    <button
                      className="button run"
                      disabled={
                        busy ||
                        !mission ||
                        !["ready", "paused"].includes(mission.status)
                      }
                      onClick={() => {
                        setCamera("Follow");
                        void action("/control/start");
                      }}
                    >
                      <Play size={14} />
                      Run
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Pause mission"
                      disabled={busy || mission?.status !== "running"}
                      onClick={() => action("/control/pause")}
                    >
                      <Pause size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label="Emergency stop"
                      disabled={
                        busy ||
                        !mission ||
                        !["ready", "running", "paused"].includes(mission.status)
                      }
                      onClick={() => action("/control/stop")}
                    >
                      <Square size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Reset mission"
                      disabled={busy || !mission}
                      onClick={() => {
                        setCamera("Isometric");
                        void action("/control/reset");
                      }}
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                  <button
                    className="button obstacle-button"
                    disabled={
                      busy ||
                      !mission ||
                      !["ready", "running", "paused"].includes(mission.status)
                    }
                    onClick={addObstacle}
                  >
                    <Box size={13} />
                    Insert obstacle
                  </button>
                </div>
              )}
              <Telemetry mission={viewed} />
            </section>
            <aside className="inspector">
              <div className="panel-heading">
                <span>
                  <Workflow size={14} />
                  INTELLIGENCE INSPECTOR
                </span>
                <span className="tiny-index">02</span>
              </div>
              <div className="inspector-tabs">
                {["Plan", "Evidence", "Safety"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={tab === t ? "active" : ""}
                  >
                    {t}
                    {t === "Evidence" &&
                      (mission?.conflicts.length ?? 0) > 0 && <i />}
                  </button>
                ))}
              </div>
              <div className="inspector-body">
                {!viewed ? (
                  <div className="inspector-empty">
                    <Workflow size={29} />
                    <h3>Ready for your objective.</h3>
                    <p>
                      Generate a mission to inspect grounded actions, evidence,
                      and safety checks.
                    </p>
                    <div className="pipeline-preview">
                      UNDERSTAND<span>↓</span>GROUND<span>↓</span>PLAN
                      <span>↓</span>VERIFY
                    </div>
                  </div>
                ) : tab === "Plan" ? (
                  <>
                    <div className="section-label">TASK INTERPRETATION</div>
                    <div className="intent-row">
                      <span className="badge">
                        {viewed.task.intent.toUpperCase()}
                      </span>
                      <code>{viewed.id.slice(0, 8)}</code>
                    </div>
                    <p className="objective">{viewed.task.objective}</p>
                    <div className="section-label">EXECUTABLE ACTIONS</div>
                    <div className="task-steps">
                      {viewed.task.actions.map((a, i) => (
                        <div
                          key={i}
                          className={
                            "task-step " +
                            (i < viewed.action_index
                              ? "done"
                              : i === viewed.action_index
                                ? "current"
                                : "")
                          }
                        >
                          <div className="step-index">
                            {i < viewed.action_index
                              ? "✓"
                              : String(i + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <strong>
                              {a.kind.charAt(0).toUpperCase() + a.kind.slice(1)}
                            </strong>
                            <small>
                              Station {a.station}
                              {a.quantity ? ` · ${a.quantity} package(s)` : ""}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="decision-box">
                      <span>
                        <ShieldCheck size={14} />
                        VALIDATED BEFORE EXECUTION
                      </span>
                      <p>
                        Grounded station IDs, bounded cargo capacity, collision
                        refusal, and restricted-area constraints.
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setWorkspace("Intelligence")}
                    >
                      Inspect decision summaries <ArrowRight size={13} />
                    </button>
                    {viewed.error && (
                      <div className="error">{viewed.error}</div>
                    )}
                  </>
                ) : tab === "Evidence" ? (
                  <>
                    <div className="section-label">
                      SAMPLE DATA / LIVE SENSOR STATE
                    </div>
                    {viewed.evidence.map((e) => (
                      <article className="mini-evidence" key={e.id}>
                        <span
                          className={
                            "badge " + (e.claim === "blocked" ? "amber" : "")
                          }
                        >
                          {e.claim}
                        </span>
                        <strong>{e.source}</strong>
                        <p>
                          Cell {e.entity} · {e.reliability} reliability metadata
                        </p>
                        <small>
                          {new Date(e.observed_at).toLocaleTimeString()}
                        </small>
                      </article>
                    ))}
                    {viewed.conflicts.map((c) => (
                      <div className="decision-box amber-box" key={c.entity}>
                        <span>
                          <TriangleAlert size={14} />
                          CONFLICT · {c.entity}
                        </span>
                        <p>{c.reason}</p>
                      </div>
                    ))}
                    <button
                      className="text-link"
                      onClick={() => setWorkspace("Evidence")}
                    >
                      Open evidence ledger <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="section-label">MANDATORY CONSTRAINTS</div>
                    {viewed.task.constraints.map((c) => (
                      <p className="safety-line" key={c}>
                        <ShieldCheck size={16} />
                        {c}
                      </p>
                    ))}
                    <div className="decision-box">
                      <span>OUTCOME VERIFICATION</span>
                      <p>
                        {viewed.verified
                          ? "Final position, delivery quantities, completed actions and collision invariants passed."
                          : "Execution must complete before this outcome can be trusted."}
                      </p>
                    </div>
                    <p className="muted">
                      Memory matches: {viewed.memory_ids.length}
                      <br />
                      Prevented unsafe steps: {viewed.metrics.prevented}
                      <br />
                      Collision count: {viewed.metrics.collisions}
                    </p>
                  </>
                )}
              </div>
              <div className="inspector-footer">
                <span className="sample-dot" />
                LOCAL CONSTRAINED GRAMMAR
              </div>
            </aside>
          </main>
          <Timeline mission={viewed} />
        </>
      ) : (
        <main className="workspace-container">
          {workspace === "Evidence" ? (
            <EvidenceView mission={mission} />
          ) : workspace === "Intelligence" ? (
            <IntelligenceView mission={mission} />
          ) : workspace === "Memory" ? (
            <MemoryView />
          ) : workspace === "Experiments" ? (
            <ExperimentsView
              onReplay={(t) => {
                setReplay(t);
                setFrame(0);
                setPlaying(false);
                setWorkspace("Studio");
              }}
            />
          ) : workspace === "Research" ? (
            <ResearchView />
          ) : (
            <SettingsView />
          )}
        </main>
      )}
      <footer className="app-footer">
        <span>
          <span className="footer-mark">P</span>INTELLIGENCE THAT PROVES ITS
          ACTIONS
        </span>
        <span>
          WAREHOUSE DOMAIN · KINEMATIC SIMULATION · NO HARDWARE CONTROL
        </span>
        <span>
          PRAXIS <span className="cyan">/</span> BUILD 001
        </span>
      </footer>
    </div>
  );
}
