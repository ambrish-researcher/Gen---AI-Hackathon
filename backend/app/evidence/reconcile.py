from datetime import datetime, timezone
from app.domain.models import Evidence


def reconcile(records: list[Evidence]) -> list[dict]:
    groups: dict[str, list[Evidence]] = {}
    for record in records:
        groups.setdefault(record.entity, []).append(record)
    conflicts = []
    for entity, rows in groups.items():
        if len({r.claim for r in rows}) < 2:
            continue
        blocked = [r for r in rows if r.claim == "blocked"]
        current = [
            r
            for r in blocked
            if r.source == "sensor"
            and (
                datetime.now(timezone.utc) - datetime.fromisoformat(r.observed_at)
            ).total_seconds()
            <= 60
        ]
        selected = max(current or blocked, key=lambda r: (r.observed_at, r.reliability))
        conflicts.append(
            {
                "entity": entity,
                "evidence_ids": [r.id for r in rows],
                "selected": selected.id,
                "resolution": "blocked",
                "reason": "Current blocked sensor observations override stale clear records; unresolved conflicts remain blocked.",
            }
        )
    return conflicts
