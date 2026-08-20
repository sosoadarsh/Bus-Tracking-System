"""In-memory simulation manager: moves a bus marker along a route's stops for demo mode.

Runs as an asyncio background task per trip. Emits LocationCreate updates to the
websocket broadcaster + stores each point in Mongo. Also detects next-stop changes
so we can send `alert:approaching` (bus is 2 stops away) events.
"""
import asyncio
from datetime import datetime, timezone
import uuid


class TripStopTracker:
    """Remembers the last computed 'next upcoming stop' per trip and returns a
    change event when the bus moves into a new segment."""

    def __init__(self):
        self._last_order: dict[str, int] = {}

    def check(self, trip_id: str, lat: float, lng: float, stops: list[dict]):
        if not stops:
            return None
        sorted_stops = sorted(stops, key=lambda s: s["stop_order"])
        # nearest stop by squared distance
        best = min(sorted_stops, key=lambda s: (s["latitude"] - lat) ** 2 + (s["longitude"] - lng) ** 2)
        upcoming = [s for s in sorted_stops if s["stop_order"] > best["stop_order"]]
        next_stop = upcoming[0] if upcoming else best
        prev_order = self._last_order.get(trip_id)
        if next_stop["stop_order"] == prev_order:
            return None
        self._last_order[trip_id] = next_stop["stop_order"]
        after = [s for s in sorted_stops if s["stop_order"] > next_stop["stop_order"]]
        target = after[0] if after else None
        return {"next_stop": next_stop, "target": target}

    def clear(self, trip_id: str):
        self._last_order.pop(trip_id, None)


tracker = TripStopTracker()


class SimulationManager:
    def __init__(self):
        self._tasks: dict[str, asyncio.Task] = {}

    def is_running(self, trip_id: str) -> bool:
        return trip_id in self._tasks and not self._tasks[trip_id].done()

    async def start(self, trip_id: str, stops: list[dict], db, broadcaster):
        if self.is_running(trip_id):
            return
        task = asyncio.create_task(self._run(trip_id, stops, db, broadcaster))
        self._tasks[trip_id] = task

    def stop(self, trip_id: str):
        task = self._tasks.pop(trip_id, None)
        if task and not task.done():
            task.cancel()
        tracker.clear(trip_id)

    async def _run(self, trip_id: str, stops: list[dict], db, broadcaster):
        SEG_STEPS = 30
        SLEEP = 1.0
        try:
            sorted_stops = sorted(stops, key=lambda s: s["stop_order"])
            path: list[tuple[float, float]] = []
            for i in range(len(sorted_stops) - 1):
                a = sorted_stops[i]; b = sorted_stops[i + 1]
                for k in range(SEG_STEPS):
                    t = k / SEG_STEPS
                    lat = a["latitude"] + (b["latitude"] - a["latitude"]) * t
                    lng = a["longitude"] + (b["longitude"] - a["longitude"]) * t
                    path.append((lat, lng))
            path.append((sorted_stops[-1]["latitude"], sorted_stops[-1]["longitude"]))

            trip = await db.trips.find_one({"id": trip_id})
            if not trip:
                return
            bus_id = trip["bus_id"]

            for lat, lng in path:
                t = await db.trips.find_one({"id": trip_id})
                if not t or t.get("status") != "ACTIVE":
                    return
                ts = datetime.now(timezone.utc).isoformat()
                point = {
                    "id": str(uuid.uuid4()), "trip_id": trip_id,
                    "latitude": lat, "longitude": lng, "timestamp": ts,
                }
                await db.locations.insert_one(point)
                await broadcaster.broadcast({
                    "type": "location:update",
                    "trip_id": trip_id, "bus_id": bus_id,
                    "latitude": lat, "longitude": lng, "timestamp": ts,
                })
                change = tracker.check(trip_id, lat, lng, sorted_stops)
                if change and change["target"]:
                    await broadcaster.broadcast({
                        "type": "alert:approaching",
                        "trip_id": trip_id, "bus_id": bus_id,
                        "next_stop_id": change["next_stop"]["id"],
                        "next_stop_name": change["next_stop"]["stop_name"],
                        "target_stop_id": change["target"]["id"],
                        "target_stop_name": change["target"]["stop_name"],
                    })
                await asyncio.sleep(SLEEP)
        except asyncio.CancelledError:
            return
        except Exception as e:
            import logging; logging.exception("Simulation error: %s", e)
        finally:
            tracker.clear(trip_id)


class Broadcaster:
    def __init__(self):
        self._clients: set = set()

    async def connect(self, ws):
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws):
        self._clients.discard(ws)

    async def broadcast(self, message: dict):
        stale = []
        for ws in list(self._clients):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self._clients.discard(ws)


simulation = SimulationManager()
broadcaster = Broadcaster()
