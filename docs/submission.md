# Hackathon submission draft

Primary track: **Wildcard [Tinkerer]**, as requested in the project directive. Official event rules, eligibility, sponsor requirements and deadline have not been independently verified. Do not submit or claim compliance until verified.

## Deliverables status

- Source, reproducible setup, environment example, sample prompts, architecture, test commands and measured fixture experiments: implemented.
- Presentation content and 3-minute demo plan: draft below.
- Public repository publication: not performed. Local commits must be reviewed before any push.
- Final demo video: not recorded. Browser screenshots/trace artifacts are development evidence only.
- Zetaris, Nightshift, actual NVIDIA Nemotron model and Meterless Engine evidence: **blocked / not implemented live**. See `integrations.md`.
- Official deadline and final submission: user action after rule verification and integration completion.

## Three-minute honest demo plan

| Time | Shot | Narration |
| --- | --- | --- |
| 0:00–0:20 | Studio and source labels | “PRAXIS turns a warehouse instruction into a grounded plan and verifies what actually happened. This recording uses the labeled local simulator and constrained parser.” |
| 0:20–0:45 | Enter delivery A → D, generate preview | “The task becomes executable navigation, pickup and delivery actions. We inspect the route and authorize execution.” |
| 0:45–1:10 | Evidence ledger | “This synthetic historical corridor record says clear; a current sensor observation says blocked. The safety rule conservatively retains blocked occupancy.” |
| 1:10–1:40 | Run, follow camera, insert obstacle | “The route changes because authoritative occupancy changed. Movement follows controller state, not a prerecorded animation.” |
| 1:40–2:00 | Verification and Memory | “Final station, delivery quantity, action completion and collision invariants must pass before retaining this outcome.” |
| 2:00–2:30 | Experiments, seed 42, export and replay | “These are recorded trials under matched task conditions. Reactive planning and PRAXIS both succeed in this fixture; this does not prove a memory or reconciliation advantage.” |
| 2:30–3:00 | Settings and limitations | “Sponsor integrations are unavailable in this build. We will replace this section with genuine query, inference and Engine evidence only after integration tests pass.” |

For the final sponsor-compliant video, replace the sample evidence and local parser shots with genuine Zetaris and Nightshift/Nemotron calls, show the selected Engine affecting behavior, identify the actual model, and display successful redacted integration evidence. Do not present the current local video as satisfying those requirements. Never show secrets.

## Presentation deck content

1. **Problem:** robotics decisions fail when operational records, sensors and past outcomes disagree.
2. **Users:** students, researchers and warehouse simulation engineers.
3. **Product:** inspectable prompt → plan → simulation → verified outcome → memory workflow.
4. **Studio:** include a captured real mission with route and evidence overlays.
5. **Architecture:** React/R3F renderer; FastAPI fixed-step controller; A* occupancy planner; SQLite records; separate provider boundaries.
6. **Evidence and safety:** timestamped provenance, conservative contradiction resolution, mandatory action preconditions and collision refusal.
7. **Closed-loop experiments:** matched seeded policies, real traces, candidate speed evaluation and retention gates.
8. **Measured results:** cite the checked-in fixture data and its scope. Show success before duration; failed static runs are shorter because they stop early.
9. **Sponsor integration:** explicitly incomplete until Zetaris, Nightshift/Nemotron and an actual Meterless Engine pass live tests. Add actual documented contracts and request evidence after validation.
10. **Research context:** ASPIRE already documents skill refinement and reusable sensorimotor skills. PRAXIS studies an evidence-management question in a different navigation setting; no superiority claim.
11. **Limitations:** kinematic abstraction, fixed map, no hardware, constrained parser, no causal memory benefit established, single operator, no production authentication.
12. **Next:** verified sponsor adapters, controlled information-budget ablations, randomized worlds, final video, official rule review and submission.

## Originality and third-party components

The target checkout was empty and had no prior commits. The PRAXIS application source was created during this task. React, Three.js/R3F/Drei, FastAPI, SQLAlchemy and other package dependencies are third-party libraries; review their package licenses before distribution. No external GLTF assets or ASPIRE source code were copied into the product. ASPIRE was consulted for research documentation and is cited separately. Project-level licensing requires the owner's choice; no license grant is assumed.
