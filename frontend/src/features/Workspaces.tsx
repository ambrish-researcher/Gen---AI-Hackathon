import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight,
  Database,
  ShieldCheck,
  FlaskConical,
  Trash2,
  RefreshCw,
  Download,
  Play,
} from "lucide-react";
import { api } from "../services/api";
import type { Mission, Memory, Integration, Experiment, Trial } from "../types";

export function EvidenceView({ mission }: { mission: Mission | null }) {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">PROVENANCE / NOT ASSUMPTIONS</div>
        <h1>
          Evidence ledger<span>.</span>
        </h1>
        <p>
          Current observations, historical claims, and the decisions that
          connect them.
        </p>
      </div>
      <div className="notice">
        SAMPLE operational data · Sensor records come from the deterministic
        simulator. No Zetaris connection is claimed.
      </div>
      <div className="split-content">
        <section>
          <h3>
            Observed claims{" "}
            <span className="count">{mission?.evidence.length ?? 0}</span>
          </h3>
          {mission?.evidence.length ? (
            mission.evidence.map((e) => (
              <article className="evidence-card" key={e.id}>
                <div className="row">
                  <span
                    className={
                      "badge " + (e.claim === "blocked" ? "amber" : "")
                    }
                  >
                    {e.claim.toUpperCase()}
                  </span>
                  <code>{e.entity}</code>
                </div>
                <h3>{e.source}</h3>
                <p>{e.provenance}</p>
                <dl>
                  <dt>Observed</dt>
                  <dd>{new Date(e.observed_at).toLocaleString()}</dd>
                  <dt>Retrieved</dt>
                  <dd>{new Date(e.retrieved_at).toLocaleString()}</dd>
                  <dt>Reliability metadata</dt>
                  <dd>
                    {e.reliability} · {e.validation_status}
                  </dd>
                  <dt>Evidence ID</dt>
                  <dd className="truncate">{e.id}</dd>
                </dl>
              </article>
            ))
          ) : (
            <Empty text="Plan a conflict scenario to retrieve contradictory claims." />
          )}
        </section>
        <section>
          <h3>Reconciliation</h3>
          {mission?.conflicts.length ? (
            mission.conflicts.map((c) => (
              <article className="evidence-card" key={c.entity}>
                <span className="badge amber">
                  CONTRADICTION RESOLVED CONSERVATIVELY
                </span>
                <h3>Cell {c.entity}</h3>
                <p>{c.reason}</p>
                <dl>
                  <dt>Resolution</dt>
                  <dd>{c.resolution}</dd>
                  <dt>Selected evidence</dt>
                  <dd className="truncate">{c.selected}</dd>
                  <dt>Competing claims</dt>
                  <dd>{c.evidence_ids.length}</dd>
                </dl>
              </article>
            ))
          ) : (
            <Empty text="No contradictory claims detected in this mission." />
          )}
          <div className="principle">
            <ShieldCheck size={24} />
            <h3>Safety has the final word.</h3>
            <p>
              Model output cannot bypass occupancy checks. Stale records never
              authorize movement through a current obstacle.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
export function IntelligenceView({ mission }: { mission: Mission | null }) {
  const [explanation, setExplanation] = useState<{
    decisions: { seq: number; kind: string; message: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (mission)
      api<typeof explanation>("/explanation")
        .then(setExplanation)
        .catch((e) => setError(e.message));
  }, [mission?.id]);
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">INTERPRET / GROUND / VERIFY</div>
        <h1>
          Decision intelligence<span>.</span>
        </h1>
        <p>
          Inspectable task representations and decision summaries, tied to the
          actual execution.
        </p>
      </div>
      {mission ? (
        <>
          <div className="notice">{mission.task.parser}</div>
          <h2>{mission.task.objective}</h2>
          <div className="split-content">
            <section>
              <h3>Executable task graph</h3>
              {mission.task.actions.map((a, i) => (
                <div className="graph-action" key={i}>
                  <span className={i < mission.action_index ? "done" : ""}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>
                      {a.kind.toUpperCase()} · {a.station}
                    </strong>
                    <p>
                      {a.quantity ? `${a.quantity} package(s) · ` : ""}
                      {i < mission.action_index
                        ? "Executed"
                        : i === mission.action_index
                          ? "Current action"
                          : "Pending preconditions"}
                    </p>
                  </div>
                </div>
              ))}
            </section>
            <section>
              <h3>Deterministic authorization</h3>
              {mission.task.constraints.map((c) => (
                <p className="safety-line" key={c}>
                  <ShieldCheck size={16} />
                  {c}
                </p>
              ))}
              <p className="muted">
                Environment: {mission.task.environment_id}
                <br />
                Memory retrieved: {mission.memory_ids.length}
                <br />
                Outcome: {mission.verified ? "Verified" : "Not yet verified"}
              </p>
              <button
                className="button"
                onClick={() => {
                  setError("");
                  api<typeof explanation>("/explanation")
                    .then(setExplanation)
                    .catch((e) => setError(e.message));
                }}
              >
                Explain this mission <ArrowUpRight size={15} />
              </button>
              {error && <p role="alert">{error}</p>}
              {explanation?.decisions.map((e) => (
                <div className="explanation" key={e.seq}>
                  <b>{e.kind}</b>
                  <p>{e.message}</p>
                </div>
              ))}
            </section>
          </div>
        </>
      ) : (
        <Empty text="Plan a mission in Studio to inspect the task graph." />
      )}
    </div>
  );
}
export function MemoryView() {
  const q = useQuery({
    queryKey: ["memory"],
    queryFn: () => api<Memory[]>("/memory"),
  });
  const client = useQueryClient();
  const [error, setError] = useState("");
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">VERIFIED / RETAINED / REVALIDATED</div>
        <h1>
          Operational memory<span>.</span>
        </h1>
        <p>
          Only verified outcomes enter trusted memory. Claims expire for reuse
          after 24 hours and are checked against current occupancy.
        </p>
      </div>
      {q.error && <p role="alert">{q.error.message}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="row">
        <span className="badge">SQLite · persistent local storage</span>
        <button
          className="icon-button"
          aria-label="Refresh memory"
          onClick={() => q.refetch()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {q.data?.length ? (
        q.data.map((r) => (
          <article className="memory-record" key={r.id}>
            <div className="memory-icon">
              <Database size={22} />
            </div>
            <div>
              <span className={"badge " + (!r.valid ? "amber" : "")}>
                {r.valid ? "VERIFIED OUTCOME" : "INVALIDATED"}
              </span>
              <h3>{r.objective}</h3>
              <p>
                {new Date(r.created_at).toLocaleString()} · {r.environment_id} ·{" "}
                {r.outcome.distance}m · {r.outcome.time}s · {r.trace.length}{" "}
                trace points
              </p>
            </div>
            <button
              className="icon-button"
              disabled={!r.valid}
              aria-label="Invalidate memory"
              onClick={() =>
                api("/memory/" + r.id, "DELETE")
                  .then(() =>
                    client.invalidateQueries({ queryKey: ["memory"] }),
                  )
                  .catch((e) => setError(e.message))
              }
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))
      ) : (
        <Empty
          text={
            q.isLoading
              ? "Loading memory…"
              : "Complete a verified mission to retain its evidence, plan, trace, and outcome."
          }
        />
      )}
    </div>
  );
}
export function ExperimentsView({
  onReplay,
}: {
  onReplay: (t: Trial) => void;
}) {
  const [seed, setSeed] = useState(42);
  const [trials, setTrials] = useState(5);
  const [scenario, setScenario] = useState("unexpected");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Experiment | null>(null);
  const q = useQuery({
    queryKey: ["experiments"],
    queryFn: () => api<Experiment[]>("/experiments"),
  });
  const data = selected ?? q.data?.[0];
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api<Experiment>("/experiments", "POST", {
          seed,
          trials,
          scenario,
        }),
      );
      await q.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    if (!data) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = `praxis-${data.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">CONTROLLED TRIALS / MEASURED OUTCOMES</div>
        <h1>
          Training laboratory<span>.</span>
        </h1>
        <p>
          Compare safe controller policies on identical seeded tasks. Evaluate a
          speed candidate and retain it only after validation.
        </p>
      </div>
      <div className="experiment-controls">
        <label>
          SCENARIO
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="unexpected">Unexpected obstacle</option>
            <option value="clear">Clear warehouse</option>
            <option value="conflict">Stale + conflicting evidence</option>
            <option value="restricted">Restricted corridor</option>
            <option value="multiple">Multiple deliveries</option>
            <option value="memory">Verified memory reuse</option>
          </select>
        </label>
        <label>
          SEED
          <input
            type="number"
            min={0}
            max={1000000}
            value={seed}
            onChange={(e) => setSeed(+e.target.value)}
          />
        </label>
        <label>
          TRIALS / POLICY
          <input
            type="number"
            min={1}
            max={20}
            value={trials}
            onChange={(e) => setTrials(+e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy} onClick={run}>
          <FlaskConical size={16} />
          {busy ? "Evaluating…" : "Run experiment"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {q.error && <p role="alert">{q.error.message}</p>}
      {data ? (
        <>
          <div className="row result-heading">
            <h3>
              {data.results.length} actual trials{" "}
              <small>
                · seed {data.config.seed} · {data.wall_ms}ms wall time
              </small>
            </h3>
            <button className="button" onClick={download}>
              <Download size={15} />
              Export JSON
            </button>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data.summary}>
                <CartesianGrid vertical={false} stroke="#26363f" />
                <XAxis
                  dataKey="controller"
                  tick={{ fill: "#9faeb6", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#9faeb6", fontSize: 11 }}
                  label={{
                    value: "Simulation time (s)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#7e939e",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#17232c",
                    border: "1px solid #354953",
                  }}
                />
                <Bar dataKey="time" fill="#64dccb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CONTROLLER</th>
                  <th>SUCCESS</th>
                  <th>TIME</th>
                  <th>DISTANCE</th>
                  <th>REPLANS</th>
                  <th>COLLISIONS</th>
                  <th>MEMORY</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((r) => (
                  <tr key={r.controller}>
                    <td>{r.controller}</td>
                    <td>{(r.success_rate * 100).toFixed(0)}%</td>
                    <td>{r.time.toFixed(2)}s</td>
                    <td>{r.distance}m</td>
                    <td>{r.replans}</td>
                    <td>{r.collisions}</td>
                    <td>{r.memory_reuses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="notice">
            <b>
              Candidate {data.candidate_retained ? "retained" : "not retained"}.
            </b>{" "}
            {data.retention_reason} This is parameter search in a kinematic
            simulator, not neural training. Failed missions may be shorter;
            compare success before time.
          </div>
          <h3>Trial traces</h3>
          <div className="trial-list">
            {data.results.map((r, i) => (
              <button className="trial-row" key={i} onClick={() => onReplay(r)}>
                <span className={r.verified ? "cyan" : "amber-text"}>
                  {r.verified ? "PASS" : "FAIL"}
                </span>
                <b>{r.controller}</b>
                <span>{r.prompt}</span>
                <small>{r.metrics.time}s</small>
                <Play size={13} />
              </button>
            ))}
          </div>
          <h3>Saved experiments</h3>
          <div className="history-pills">
            {q.data?.map((e) => (
              <button
                key={e.id}
                className="button"
                onClick={() => setSelected(e)}
              >
                Seed {e.config.seed} · {e.config.scenario}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Empty text="Run a seeded experiment to generate results. No benchmark values are prefilled." />
      )}
    </div>
  );
}
export function ResearchView() {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">A HYPOTHESIS TO TEST</div>
        <h1>
          Reliability, with receipts<span>.</span>
        </h1>
        <p>
          Does evidence reconciliation and verified memory improve
          warehouse-task reliability under information conflicts?
        </p>
      </div>
      <div className="split-content">
        <section>
          <h3>Evaluation protocol</h3>
          <ol className="research-list">
            <li>
              Run the same tasks, maps, seeds and collision guards for every
              policy.
            </li>
            <li>
              Static A* stops safely at unexpected obstacles. Reactive A*
              replans on contact with its next occupied cell.
            </li>
            <li>
              PRAXIS uses occupancy observations proactively, reconciles
              evidence and revalidates persistent memory.
            </li>
            <li>
              Compare success before latency, route length or replans. Preserve
              failed traces.
            </li>
            <li>
              Use the Experiments workspace to produce exportable measured
              results.
            </li>
          </ol>
          <div className="notice">
            Memory retrieval is implemented; a causal memory benefit has not
            been established. The current sensor model already exposes all
            initial obstacles to PRAXIS.
          </div>
        </section>
        <section>
          <h3>ASPIRE research status</h3>
          <p className="muted">
            The official NVlabs/ASPIRE README and LIBERO-Pro runbook were
            reviewed at commit fa00f0e. They document iterative skill
            refinement, evolutionary search, reusable sensorimotor skills, and
            evaluation on LIBERO-Pro, Robosuite and BEHAVIOR-1K. PRAXIS has not
            run these benchmarks or compared performance.
          </p>
          <div className="principle">
            <FlaskConical size={25} />
            <h3>Scope matters.</h3>
            <p>
              Grid navigation and pickup/delivery abstractions are not
              manipulation benchmarks. This simulator does not model rigid-body
              contacts, lidar noise, or hardware deployment.
            </p>
          </div>
          <p className="muted">
            <a
              href="https://github.com/NVlabs/ASPIRE/tree/fa00f0ef2bc1d91d594b9aa502c22133c9f538f7"
              target="_blank"
              rel="noreferrer"
            >
              Read the pinned ASPIRE source ↗
            </a>
          </p>
          <h3>Extensible, honestly</h3>
          <p className="muted">
            The domain adapter separates map and station data from planning.
            Warehouse is the only implemented domain. Future robotics adapters
            and neural policies require separate implementation and validation.
          </p>
        </section>
      </div>
    </div>
  );
}
export function SettingsView() {
  const q = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api<Integration[]>("/integrations"),
  });
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div className="eyebrow">INTEGRATIONS / TRUTHFUL DIAGNOSTICS</div>
        <h1>
          Connected intelligence<span>.</span>
        </h1>
        <p>
          Provider availability is separate from local simulation readiness.
        </p>
      </div>
      <div className="notice">
        LOCAL / SAMPLE mode. The constrained parser and warehouse fixtures are
        operational. No live sponsor integration has been verified.
      </div>
      <button className="button" onClick={() => q.refetch()}>
        <RefreshCw size={14} />
        Refresh configuration presence
      </button>
      {q.error && <p role="alert">{q.error.message}</p>}
      <div className="integration-grid">
        {q.data?.map((i) => (
          <article className="integration-card" key={i.id}>
            <div className="row">
              <div className="integration-symbol">{i.name.slice(0, 1)}</div>
              <span className="badge amber">{i.status}</span>
            </div>
            <h2>{i.name}</h2>
            <p>{i.detail}</p>
            <dl>
              <dt>Configuration present</dt>
              <dd>{i.configured_names.join(", ") || "None"}</dd>
              <dt>Last successful call</dt>
              <dd>{i.last_success ?? "Not verified"}</dd>
              <dt>Latency</dt>
              <dd>{i.latency_ms ?? "Not measured"}</dd>
            </dl>
          </article>
        ))}
      </div>
      <p className="muted">
        Keep credentials server-side. Supply official documentation and
        endpoints before enabling live calls. Never put API keys in browser
        configuration or Git.
      </p>
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-orbit" />
      <p>{text}</p>
    </div>
  );
}
