"""In-memory simulation manager: moves a bus marker along a route's stops for demo mode.

Runs as an asyncio background task per trip. Emits LocationCreate updates to the
websocket broadcaster + stores each point in Mongo.
"""
import asyncio
from datetime import datetime, timezone
import uuid


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

    async def _run(self, trip_id: str, stops: list[dict], db, broadcaster):
        # Build a smooth path: interpolate 30 sub-points between consecutive stops.
        SEG_STEPS = 30
        SLEEP = 1.0  # seconds between sub-points -> whole route ~2min
        try:
            path: list[tuple[float, float]] = []
            sorted_stops = sorted(stops, key=lambda s: s["stop_order"])
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
                # Check trip is still active
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
                await asyncio.sleep(SLEEP)
        except asyncio.CancelledError:
            return
        except Exception as e:
            import logging; logging.exception("Simulation error: %s", e)


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
