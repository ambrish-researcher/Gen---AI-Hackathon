import type { Mission } from "../types";
export function Telemetry({ mission }: { mission: Mission | null }) {
  const m = mission?.metrics;
  return (
    <div className="telemetry">
      <div>
        <span>MISSION TIME</span>
        <strong>
          {m?.time.toFixed(1) ?? "0.0"}
          <small> s</small>
        </strong>
      </div>
      <div>
        <span>DISTANCE</span>
        <strong>
          {m?.distance.toFixed(1) ?? "0.0"}
          <small> m</small>
        </strong>
      </div>
      <div>
        <span>REPLANS</span>
        <strong>
          {m?.replans ?? 0}
          <small> events</small>
        </strong>
      </div>
      <div>
        <span>COLLISIONS</span>
        <strong className="cyan">
          {m?.collisions ?? 0}
          <small> detected</small>
        </strong>
      </div>
      <div>
        <span>CARGO</span>
        <strong>
          {mission?.cargo ?? 0}
          <small> / 2</small>
        </strong>
      </div>
      <div className="verification">
        <span>OUTCOME</span>
        <strong className={mission?.verified ? "cyan" : ""}>
          {mission?.verified
            ? "VERIFIED"
            : mission?.status === "failed"
              ? "FAILED"
              : "PENDING"}
        </strong>
      </div>
    </div>
  );
}
export function Timeline({ mission }: { mission: Mission | null }) {
  return (
    <section className="timeline">
      <div className="panel-heading">
        <span>
          <i className="live-dot" />
          EXECUTION TRACE
        </span>
        <small>{mission?.events.length ?? 0} events · simulated time</small>
      </div>
      <div className="timeline-events">
        {mission?.events.length ? (
          mission.events
            .slice()
            .reverse()
            .map((e) => (
              <div className={"event " + e.kind} key={e.seq}>
                <time>{e.time.toFixed(2)}s</time>
                <b>{e.kind}</b>
                <span>{e.message}</span>
              </div>
            ))
        ) : (
          <div className="empty-inline">
            Awaiting a mission. Every planning decision and action appears here.
          </div>
        )}
      </div>
    </section>
  );
}
