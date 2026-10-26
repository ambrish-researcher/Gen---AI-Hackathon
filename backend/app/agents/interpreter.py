import re
from app.domain.models import Task, Action
from app.domain.warehouse import Warehouse


def interpret(prompt: str) -> Task:
    text = prompt.lower().strip()
    if re.search(
        r"\b(fly|jump|weld|climb|attack|ignore safety|disable safety)\b", text
    ):
        raise ValueError(
            "Unsupported robot capability. Available: navigate, inspect, pickup and delivery."
        )
    names = re.findall(
        r"\bstation\s+([a-z0-9]+)\b|\b(loading dock|dock|charging station)\b", text
    )
    refs = [
        (a.upper() if a else ("Charge" if b == "charging station" else "Dock"))
        for a, b in names
    ]
    if any(n not in Warehouse.stations for n in refs):
        raise ValueError(
            "Unknown station. Use Station A, B, C, D, loading dock or charging station."
        )
    if not refs:
        raise ValueError(
            "Specify a known destination, for example “Navigate to Station C”."
        )
    if not re.search(
        r"\b(move|go|navigate|deliver|transport|pick\s?up|inspect|take)\b", text
    ):
        raise ValueError(
            "Unsupported instruction. Use navigate, inspect, pickup or deliver with station names."
        )
    if re.search(r"\b(three|four|five|[3-9]|\d{2,})\s+packages?\b", text):
        raise ValueError("Robot capacity is two packages. Split this mission.")
    # Reject unrecognized clauses instead of discarding instructions that we cannot honor.
    if re.search(r"\b(not|don't|never|via|before|instead|except|without)\b", text):
        raise ValueError(
            "This constrained parser cannot ground that ordering or negation. Use explicit positive waypoint instructions."
        )
    for clause in re.findall(r"\bavoid\s+([^,.]+)", text):
        if not re.match(
            r"(restricted(?: areas?| zones?)?|corridor b|obstacles?)\b", clause
        ):
            raise ValueError(
                "Supported avoidance constraints: restricted areas, obstacles, or Corridor B."
            )
    normalized = re.sub(r"\bstation\s+[a-z0-9]+\b|\bcorridor\s+b\b", "", text)
    vocabulary = set(
        "deliver delivery the package packages from to avoid restricted areas area zones zone verify corridor conditions condition and choose a safe route move go navigate inspect take transport pick up pickup two one 1 2 charging station loading dock then at please of all with because it may be blocked obstacles obstacle".split()
    )
    unknown = set(re.findall(r"[a-z0-9']+", normalized)) - vocabulary
    if unknown:
        raise ValueError(
            "Unsupported wording in local constrained grammar: "
            + ", ".join(sorted(unknown))
            + ". Use a supported example or simplify the instruction."
        )
    cargo = bool(re.search(r"\b(deliver|transport|pick\s?up|take)\b", text))
    pickup_only = cargo and not re.search(r"\b(deliver|transport|take)\b", text)
    quantity = 2 if re.search(r"\b(two|2)\s+packages?\b", text) else 1
    constraints = ["Avoid restricted cells", "Refuse collisions"]
    if re.search(r"\bavoid\s+corridor\s+b\b", text):
        constraints.append("Avoid Corridor B")
    if re.search(r"\bcorridor\s+(?!b\b)[a-z]\b", text):
        raise ValueError("Only Corridor B is named in this environment.")
    if cargo:
        source = refs[0] if len(refs) > 1 or pickup_only else "A"
        dests = refs[1:] if len(refs) > 1 else ([] if pickup_only else refs)
        if len(dests) > 2:
            raise ValueError("At most two deliveries per mission are supported.")
        quantity = max(quantity, len(dests))
        actions = [
            Action(kind="navigate", station=source),
            Action(kind="pickup", station=source, quantity=quantity),
        ]
        remaining = quantity
        for i, dest in enumerate(dests):
            q = remaining if i == len(dests) - 1 else 1
            actions += [
                Action(kind="navigate", station=dest),
                Action(kind="deliver", station=dest, quantity=q),
            ]
            remaining -= q
        return Task(
            intent="pickup" if pickup_only else "deliver",
            objective=prompt,
            source=source,
            destinations=dests,
            constraints=constraints,
            actions=actions,
        )
    actions = [Action(kind="navigate", station=r) for r in refs]
    if "inspect" in text:
        actions.append(Action(kind="inspect", station=refs[-1]))
    return Task(
        intent="inspect" if "inspect" in text else "navigate",
        objective=prompt,
        destinations=refs,
        constraints=constraints,
        actions=actions,
    )
