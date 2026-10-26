# Supported local prompts

- `Navigate to Station B.` → navigate from current initial A to B.
- `Navigate from Station A to Station C.` → explicit A waypoint, then C.
- `Pick up two packages at Station C.` → navigate C, pick up two, retain cargo.
- `Deliver two packages from Station C to Station D and loading dock.` → C pickup, D one package, Dock one package.
- `Inspect Station B and avoid Corridor B.` → navigate B with additional corridor restriction, create sensor inspection record.
- `Deliver the package from Station A to Station D. Avoid restricted areas, verify corridor conditions, and choose a safe route.` → preview before authorization; conflict fixture records remain labeled SAMPLE.

Commands in the Studio composer: `Explain this mission.`, `Explain why the robot changed direction.`, `Place an obstacle in front of the robot.`, `Compare controllers.`, `Run experiments.` Use the laboratory to choose a seed/trial count rather than the command defaults.

Rejections: `Fly to Station B`, `Navigate to Station Z`, `Pick up three packages at Station C`, `Navigate to Station C via Station B`, unknown extra clauses, unsupported avoidance constraints, and negated ordering. These return explanatory validation errors; no substitute mission is executed.

Each fixture resets initial station inventory. Charging station has no packages. “Deliver to Station D” defaults its source to A, shown in the plan; give an explicit source when needed. “Avoid Corridor B” alone has no destination and requests clarification via a validation error.
