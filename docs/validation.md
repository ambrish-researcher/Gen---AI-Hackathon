# Validation record

Validation covers the local/sample workflow; live sponsor acceptance is not included.

## Automated checks

- Backend: 44 pytest tests passing, covering grounded parsing and rejected clauses, station navigation, A*, no-route failure, cargo and inventory checks, multi-delivery, restricted corridors, dynamic replanning, collision refusal, freshness-aware contradiction resolution, pause/resume/stop, persistence/invalidation, verified-memory retrieval, all six experiment scenarios, API lifecycle and WebSocket snapshots.
- Frontend: five React Testing Library/Vitest scenarios cover initial render, real prompt request payloads, plan/run/pause/stop/reset controls, visible validation errors, exact explanation/obstacle commands, and all seven workspaces. All five scenarios passed in the final unit-test run.
- Build: strict TypeScript and Vite production build exercised. The Three.js dependency chunk is approximately 1.15MB minified / 320KB gzip; Vite emits a large-chunk warning. The scene component is lazy-loaded. This is a remaining download/performance cost, not a failed build.
- Real Chromium tests exercise WebGL initialization, B/C/D mission completion, obstacle insertion/replanning, exact final station and persisted verified outcomes, invalid tasks, conflicting evidence, measured experiment results, replay, unavailable sponsor labeling, tablet layout and reduced motion. All three browser tests passed in the final connected run (2.5 minutes, software Chromium), with no collected page errors in the three-mission workflow. The report lives in ignored `frontend/test-results/results.json`.
- `scripts/install.sh` has been executed against the pinned requirements and npm lockfile, including repeat installation. A fresh local clone of source commit `6051f83` with a new Python virtualenv installed and built successfully, then started both services with `scripts/start.sh`. A functional delivery of two packages from A to D verified, with 15m simulated distance, 15.95s simulated duration, zero collisions, and one persisted verified-memory record. This is a local clone check, not proof of remote availability or fresh cloud snapshot restoration.

The backend currently emits a Starlette warning that its httpx-backed test client is deprecated in favor of httpx2. The existing supported test path still completes successfully; no warning is suppressed.

## Browser defects investigated

The initial combined browser test exceeded its 60-second budget while exercising three real-time missions and software WebGL screenshots. It now has a 180-second budget. Locator errors were corrected to distinguish workspace navigation from inspector tabs and allow multiple persistent memory records; each newly generated memory ID is independently verified through the API.

A later browser run caught an actual HTML portal teardown error on leaving the 3D workspace. Scene labels were replaced with managed WebGL text sprites, removing those DOM portals and adding explicit texture disposal. The subsequent complete browser run passed with no collected page errors in the connected three-mission workflow.

## Measurements and interpretation

The checked-in `experiments/` files are measured local runs, not prefilled UI charts. Six scenarios each contain five trials per policy (four policies), totaling 120 trial outcomes. Seed 42 yields fixed station tasks; layouts do not vary. In the unexpected-obstacle fixture, static A* verifies 0/5, reactive A* 5/5 and PRAXIS 5/5. All guards prevent collision. Static failure duration must not be interpreted as faster task completion. See `research.md` for limitations.

Software-only headless Chromium rendered at low single-digit FPS in the initial high-quality view. An adaptive quality fallback and explicit low mode are implemented. No desktop-GPU 60FPS claim has been validated. The on-screen FPS comes from real frame intervals; mission time comes from fixed simulation ticks and is independent of rendering.

No live Zetaris query, Nightshift inference, Nemotron model identification or Meterless Engine conformance test has run. Those remain required external integration gates. CI workflow is supplied but its hosted execution has not been observed. Public GitHub push, cloud publication and fresh-task snapshot restoration have not been performed.
