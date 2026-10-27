# PRAXIS — Product Contract (Locked)

## Identity
PRAXIS is an evidence-grounded, cross-domain Autonomous Intelligence Evolution Platform for the GenAI hackathon Wildcard track, integrating the three challenges: fragmented intelligence, explainable decisions, and reasoning architecture. NOT a robotics-only simulator, NOT a point-A-to-B navigator, NOT a generic chatbot.

## User promise
A user supplies a complex objective. PRAXIS discovers available authorized capabilities, decomposes the objective, collects and reconciles evidence, plans, executes real tools, observes outcomes, runs controlled experiments where possible, diagnoses failures, improves strategies, independently verifies results, explains decisions and uncertainty, and stores only validated reusable skills. Unsupported actions are clearly identified. Sensitive actions require approval.

## Mandatory product loop
OBJECTIVE -> DISCOVER -> EVIDENCE -> PLAN -> ACT -> OBSERVE -> EXPERIMENT -> DIAGNOSE -> IMPROVE -> VERIFY -> EXPLAIN -> VALIDATED MEMORY.

## Key modules
1. Mission orchestration with typed states, durable event log, retries, approval gates, cancellation and resumability.
2. Tool registry with least-privilege access, sandboxed execution, timeouts and transparent failures.
3. Evidence graph with source provenance, timestamps, contradictions, uncertainty and citations.
4. Hypothesis and experiment lab: competing strategies, baseline, real test execution, metrics, rollback and acceptance gates.
5. Skill evolution: versioned reusable procedures with tests, provenance, scope, limits and transfer evaluation; never imply LLM weights were trained when only skills were refined.
6. Decision inspector: reconstructable decisions from evidence and tool results, not hidden chain-of-thought.
7. Sponsor adapters: NVIDIA Nemotron through authenticated Meterless Nightshift or direct NVIDIA endpoint; Zetaris via actual supported connection; Meterless Agent Engine only where documented and working. Show integration health truthfully, with explicit fallback states.
8. Cross-domain demos: (a) software bug fixing with test runner, (b) data investigation with source-backed analytics, (c) research/hypothesis evaluation with verifiable source and experiment steps. No fabricated metrics, no fake live agents.
9. Analytics: real task success, time, latency, cost when available, verification pass rate, experiment deltas and error traces.

## Visual and interaction contract
Lusion-inspired quality, not copied design/assets. Cinematic landing page with purposeful real-time 3D, strong typography, restrained motion, meaningful lighting and transitions. Mission Control, Evidence Universe (interactive 2D/3D provenance graph), Experiment Lab, Skill Evolution, Decision Inspector, Integration Health. React/Next.js, TypeScript, React Three Fiber/Three.js, GSAP where appropriate. Excellent accessibility, keyboard support, reduced-motion mode, mobile fallback, loading/error/empty states, adaptive pixel ratio, lazy loading and responsive performance. 3D nodes must reflect real mission events, never decorative fabricated status.

## Delivery acceptance criteria
- A new user can submit an objective and watch a real, persistent execution trace.
- At least 3 genuinely different non-robotics workflows run end-to-end with actual tools and verifiable results.
- At least one task has baseline -> failure/limitation -> revised strategy -> retest -> measured improvement.
- Verified reusable skill is stored, then tested on a second task.
- Evidence graph, decision inspector and analytics show actual data.
- NVIDIA/Nightshift, Zetaris and Agent Engine connection status is accurate, with secrets only server-side and no hardcoded keys.
- Unit, integration, browser E2E and accessibility/performance smoke tests pass; README includes reproducible local setup, environment variables, honest limitations and demo script.

## Repository and safety
Develop on `develop/praxis-intelligence-platform`. Preserve `main` and `backup/robotics-prototype-before-praxis-rebuild` until the user explicitly approves migration. The old warehouse robotics application is legacy and must not define the new product. Do not delete branches, deploy publicly, or expose credentials without explicit approval. Do not claim external local Windows services are reachable from Codex cloud; use env-configured URLs, secure integration paths and documented local tests.

## Implementation priority
First functional vertical slice with real event-sourced mission workflow, tool execution, evidence/verification and a polished visual shell. Then experiment/skill evolution, sponsor integrations, multi-domain demos, hardening and visual refinement. Do not replace real function with mock success screens.
