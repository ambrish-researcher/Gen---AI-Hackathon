from typing import Protocol
from app.domain.models import Point


class DomainAdapter(Protocol):
    id: str
    stations: dict[str, Point]

    def blocked(self) -> set[Point]: ...
class Warehouse:
    id = "warehouse-v1"
    width, height = 20, 16
    stations = {
        "A": (2, 12),
        "B": (2, 2),
        "C": (17, 2),
        "D": (17, 12),
        "Dock": (18, 8),
        "Charge": (1, 8),
    }
    shelves = {
        (x, y)
        for x0 in (5, 12)
        for y0 in (3, 9)
        for x in range(x0, x0 + 3)
        for y in range(y0, y0 + 3)
    }
    restricted = {(x, y) for x in (9, 10) for y in range(0, 5)}
    corridor_b = {(9, y) for y in range(5, 12)}

    def blocked(self):
        return self.shelves | self.restricted

    def data(self):
        return {
            "id": self.id,
            "width": self.width,
            "height": self.height,
            "stations": self.stations,
            "shelves": sorted(self.shelves),
            "restricted": sorted(self.restricted),
            "corridor_b": sorted(self.corridor_b),
        }
