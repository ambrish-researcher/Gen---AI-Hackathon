import heapq
from app.domain.models import Point


def astar(
    start: Point, goal: Point, blocked: set[Point], width=20, height=16
) -> list[Point]:
    if start in blocked or goal in blocked:
        raise ValueError("Start or destination is blocked")
    queue = [(0, start)]
    cost = {start: 0}
    parent: dict[Point, Point] = {}
    while queue:
        _, current = heapq.heappop(queue)
        if current == goal:
            path = [goal]
            while path[-1] != start:
                path.append(parent[path[-1]])
            return path[::-1]
        for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
            p = (current[0] + dx, current[1] + dy)
            if not (0 <= p[0] < width and 0 <= p[1] < height) or p in blocked:
                continue
            score = cost[current] + 1
            if score < cost.get(p, float("inf")):
                cost[p], parent[p] = score, current
                heapq.heappush(
                    queue, (score + abs(p[0] - goal[0]) + abs(p[1] - goal[1]), p)
                )
    raise ValueError(
        "No safe route exists; remove an obstacle or choose another destination"
    )
