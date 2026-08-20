"""College Bus Tracking System — FastAPI backend.

Endpoints under /api/*, live tracking via /api/ws.
"""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role,
)
from models import (
    LoginBody, RegisterStudentBody, CreateDriverBody, UpdateUserBody,
    Bus, BusCreate, BusUpdate,
    Route, RouteCreate, RouteUpdate,
    Stop, StopCreate, StopUpdate,
    Assignment, AssignmentCreate,
    LocationCreate,
)
from seed import seed_all
from simulation import simulation, broadcaster

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("bus-tracking")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="College Bus Tracking System")
api = APIRouter(prefix="/api")


# ---------- helpers ----------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---------- auth ----------
@api.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")
    return {"user": _strip(user), "token": token}


@api.post("/auth/register")
async def register_student(body: RegisterStudentBody, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()), "name": body.name, "email": email,
        "password_hash": hash_password(body.password), "role": "STUDENT",
        "phone": body.phone, "student_id": body.student_id,
        "department": body.department, "year": body.year,
        "created_at": _now(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, "STUDENT")
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")
    return {"user": _strip(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response, _=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- buses ----------
@api.get("/buses")
async def list_buses(user=Depends(get_current_user)):
    return [_strip(b) for b in await db.buses.find({}).to_list(1000)]


@api.post("/buses")
async def create_bus(body: BusCreate, _=Depends(require_role("ADMIN"))):
    if await db.buses.find_one({"bus_number": body.bus_number}):
        raise HTTPException(409, "Bus number already exists")
    if await db.buses.find_one({"registration_number": body.registration_number}):
        raise HTTPException(409, "Registration number already exists")
    bus = Bus(**body.model_dump())
    await db.buses.insert_one(bus.model_dump())
    return bus.model_dump()


@api.put("/buses/{bus_id}")
async def update_bus(bus_id: str, body: BusUpdate, _=Depends(require_role("ADMIN"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = _now()
    res = await db.buses.update_one({"id": bus_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Bus not found")
    return _strip(await db.buses.find_one({"id": bus_id}))


@api.delete("/buses/{bus_id}")
async def delete_bus(bus_id: str, _=Depends(require_role("ADMIN"))):
    # prevent delete if referenced by active trip
    if await db.trips.find_one({"bus_id": bus_id, "status": "ACTIVE"}):
        raise HTTPException(409, "Bus is currently on an active trip")
    await db.assignments.delete_many({"bus_id": bus_id})
    res = await db.buses.delete_one({"id": bus_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Bus not found")
    return {"ok": True}


# ---------- users: drivers / students ----------
@api.get("/drivers")
async def list_drivers(_=Depends(require_role("ADMIN"))):
    return [_strip(u) for u in await db.users.find({"role": "DRIVER"}).to_list(1000)]


@api.post("/drivers")
async def create_driver(body: CreateDriverBody, _=Depends(require_role("ADMIN"))):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already exists")
    user = {
        "id": str(uuid.uuid4()), "name": body.name, "email": email,
        "password_hash": hash_password(body.password), "role": "DRIVER",
        "phone": body.phone, "license_number": body.license_number, "created_at": _now(),
    }
    await db.users.insert_one(user)
    return _strip(user)


@api.put("/drivers/{driver_id}")
async def update_driver(driver_id: str, body: UpdateUserBody, _=Depends(require_role("ADMIN"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    res = await db.users.update_one({"id": driver_id, "role": "DRIVER"}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Driver not found")
    return _strip(await db.users.find_one({"id": driver_id}))


@api.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, _=Depends(require_role("ADMIN"))):
    if await db.trips.find_one({"driver_id": driver_id, "status": "ACTIVE"}):
        raise HTTPException(409, "Driver has an active trip")
    await db.assignments.delete_many({"driver_id": driver_id})
    await db.users.delete_one({"id": driver_id, "role": "DRIVER"})
    return {"ok": True}


@api.get("/students")
async def list_students(_=Depends(require_role("ADMIN"))):
    return [_strip(u) for u in await db.users.find({"role": "STUDENT"}).to_list(2000)]


@api.delete("/students/{student_id}")
async def delete_student(student_id: str, _=Depends(require_role("ADMIN"))):
    await db.users.delete_one({"id": student_id, "role": "STUDENT"})
    return {"ok": True}


# ---------- routes ----------
@api.get("/routes")
async def list_routes(user=Depends(get_current_user)):
    routes = [_strip(r) for r in await db.routes.find({}).to_list(1000)]
    for r in routes:
        stops = await db.stops.find({"route_id": r["id"]}).sort("stop_order", 1).to_list(500)
        r["stops"] = [_strip(s) for s in stops]
    return routes


@api.get("/routes/{route_id}")
async def get_route(route_id: str, user=Depends(get_current_user)):
    r = await db.routes.find_one({"id": route_id})
    if not r:
        raise HTTPException(404, "Route not found")
    r = _strip(r)
    stops = await db.stops.find({"route_id": route_id}).sort("stop_order", 1).to_list(500)
    r["stops"] = [_strip(s) for s in stops]
    return r


@api.post("/routes")
async def create_route(body: RouteCreate, _=Depends(require_role("ADMIN"))):
    route = Route(**{k: v for k, v in body.model_dump().items() if k != "stops"})
    await db.routes.insert_one(route.model_dump())
    if body.stops:
        for s in body.stops:
            stop = Stop(route_id=route.id, **s.model_dump())
            await db.stops.insert_one(stop.model_dump())
    return await get_route(route.id, {"role": "ADMIN"})


@api.put("/routes/{route_id}")
async def update_route(route_id: str, body: RouteUpdate, _=Depends(require_role("ADMIN"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.routes.update_one({"id": route_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Route not found")
    return await get_route(route_id, {"role": "ADMIN"})


@api.delete("/routes/{route_id}")
async def delete_route(route_id: str, _=Depends(require_role("ADMIN"))):
    if await db.trips.find_one({"route_id": route_id, "status": "ACTIVE"}):
        raise HTTPException(409, "Route has an active trip")
    await db.stops.delete_many({"route_id": route_id})
    await db.assignments.delete_many({"route_id": route_id})
    await db.routes.delete_one({"id": route_id})
    return {"ok": True}


# ---------- stops ----------
@api.post("/routes/{route_id}/stops")
async def add_stop(route_id: str, body: StopCreate, _=Depends(require_role("ADMIN"))):
    if not await db.routes.find_one({"id": route_id}):
        raise HTTPException(404, "Route not found")
    stop = Stop(route_id=route_id, **body.model_dump())
    await db.stops.insert_one(stop.model_dump())
    return stop.model_dump()


@api.put("/stops/{stop_id}")
async def update_stop(stop_id: str, body: StopUpdate, _=Depends(require_role("ADMIN"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.stops.update_one({"id": stop_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Stop not found")
    return _strip(await db.stops.find_one({"id": stop_id}))


@api.delete("/stops/{stop_id}")
async def delete_stop(stop_id: str, _=Depends(require_role("ADMIN"))):
    await db.stops.delete_one({"id": stop_id})
    return {"ok": True}


# ---------- assignments ----------
@api.get("/assignments")
async def list_assignments(user=Depends(get_current_user)):
    q = {}
    # driver can only see own
    if user["role"] == "DRIVER":
        q = {"driver_id": user["id"]}
    items = [_strip(a) for a in await db.assignments.find(q).to_list(1000)]
    # enrich
    for a in items:
        bus = await db.buses.find_one({"id": a["bus_id"]})
        drv = await db.users.find_one({"id": a["driver_id"]})
        rt = await db.routes.find_one({"id": a["route_id"]})
        a["bus"] = _strip(bus) if bus else None
        a["driver"] = _strip(drv) if drv else None
        a["route"] = _strip(rt) if rt else None
    return items


@api.post("/assignments")
async def create_assignment(body: AssignmentCreate, _=Depends(require_role("ADMIN"))):
    for coll, id_ in (("buses", body.bus_id), ("users", body.driver_id), ("routes", body.route_id)):
        if not await db[coll].find_one({"id": id_}):
            raise HTTPException(400, f"Invalid {coll[:-1]} id")
    a = Assignment(**body.model_dump())
    await db.assignments.insert_one(a.model_dump())
    return a.model_dump()


@api.delete("/assignments/{aid}")
async def delete_assignment(aid: str, _=Depends(require_role("ADMIN"))):
    await db.assignments.delete_one({"id": aid})
    return {"ok": True}


# ---------- trips ----------
@api.get("/trips")
async def list_trips(status: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if status:
        q["status"] = status
    if user["role"] == "DRIVER":
        q["driver_id"] = user["id"]
    trips = [_strip(t) for t in await db.trips.find(q).sort("start_time", -1).to_list(500)]
    for t in trips:
        bus = await db.buses.find_one({"id": t["bus_id"]})
        drv = await db.users.find_one({"id": t["driver_id"]})
        rt = await db.routes.find_one({"id": t["route_id"]})
        t["bus"] = _strip(bus) if bus else None
        t["driver"] = _strip(drv) if drv else None
        t["route"] = _strip(rt) if rt else None
    return trips


@api.get("/trips/active")
async def list_active_trips(user=Depends(get_current_user)):
    return await list_trips(status="ACTIVE", user=user)


@api.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user=Depends(get_current_user)):
    t = await db.trips.find_one({"id": trip_id})
    if not t:
        raise HTTPException(404, "Trip not found")
    t = _strip(t)
    bus = await db.buses.find_one({"id": t["bus_id"]})
    drv = await db.users.find_one({"id": t["driver_id"]})
    rt = await db.routes.find_one({"id": t["route_id"]})
    stops = await db.stops.find({"route_id": t["route_id"]}).sort("stop_order", 1).to_list(500)
    t["bus"] = _strip(bus) if bus else None
    t["driver"] = _strip(drv) if drv else None
    t["route"] = _strip(rt) if rt else None
    t["stops"] = [_strip(s) for s in stops]
    latest = await db.locations.find({"trip_id": trip_id}).sort("timestamp", -1).limit(1).to_list(1)
    t["latest_location"] = _strip(latest[0]) if latest else None
    return t


@api.post("/trips/start")
async def start_trip(body: dict, user=Depends(require_role("DRIVER"))):
    demo_mode = bool(body.get("demo_mode", False))
    assignment_id = body.get("assignment_id")
    if not assignment_id:
        raise HTTPException(400, "assignment_id required")
    a = await db.assignments.find_one({"id": assignment_id, "driver_id": user["id"]})
    if not a:
        raise HTTPException(404, "Assignment not found for this driver")
    if await db.trips.find_one({"driver_id": user["id"], "status": "ACTIVE"}):
        raise HTTPException(409, "You already have an active trip")

    trip = {
        "id": str(uuid.uuid4()), "bus_id": a["bus_id"], "driver_id": a["driver_id"],
        "route_id": a["route_id"], "start_time": _now(), "end_time": None,
        "status": "ACTIVE", "demo_mode": demo_mode,
    }
    await db.trips.insert_one(trip)
    trip.pop("_id", None)
    await db.buses.update_one({"id": a["bus_id"]}, {"$set": {"status": "ACTIVE", "updated_at": _now()}})

    if demo_mode:
        stops = await db.stops.find({"route_id": a["route_id"]}).sort("stop_order", 1).to_list(500)
        await simulation.start(trip["id"], [_strip(s) for s in stops], db, broadcaster)

    await broadcaster.broadcast({"type": "trip:started", "trip_id": trip["id"], "bus_id": a["bus_id"]})
    return trip


@api.post("/trips/{trip_id}/end")
async def end_trip(trip_id: str, user=Depends(require_role("DRIVER"))):
    t = await db.trips.find_one({"id": trip_id, "driver_id": user["id"]})
    if not t:
        raise HTTPException(404, "Trip not found")
    if t["status"] != "ACTIVE":
        raise HTTPException(409, "Trip is not active")
    simulation.stop(trip_id)
    await db.trips.update_one({"id": trip_id}, {"$set": {"status": "COMPLETED", "end_time": _now()}})
    await db.buses.update_one({"id": t["bus_id"]}, {"$set": {"status": "INACTIVE", "updated_at": _now()}})
    await broadcaster.broadcast({"type": "trip:ended", "trip_id": trip_id, "bus_id": t["bus_id"]})
    return {"ok": True}


# ---------- locations ----------
@api.post("/trips/{trip_id}/location")
async def push_location(trip_id: str, body: LocationCreate, user=Depends(require_role("DRIVER"))):
    t = await db.trips.find_one({"id": trip_id, "driver_id": user["id"]})
    if not t or t["status"] != "ACTIVE":
        raise HTTPException(409, "Trip not active")
    point = {
        "id": str(uuid.uuid4()), "trip_id": trip_id,
        "latitude": body.latitude, "longitude": body.longitude,
        "timestamp": _now(),
    }
    await db.locations.insert_one(point)
    await broadcaster.broadcast({
        "type": "location:update", "trip_id": trip_id, "bus_id": t["bus_id"],
        "latitude": body.latitude, "longitude": body.longitude, "timestamp": point["timestamp"],
    })
    return _strip(point)


@api.get("/trips/{trip_id}/location")
async def get_locations(trip_id: str, user=Depends(get_current_user)):
    latest = await db.locations.find({"trip_id": trip_id}).sort("timestamp", -1).limit(1).to_list(1)
    return _strip(latest[0]) if latest else None


# ---------- stats ----------
@api.get("/stats/overview")
async def stats(_=Depends(require_role("ADMIN"))):
    total_buses = await db.buses.count_documents({})
    active_buses = await db.buses.count_documents({"status": "ACTIVE"})
    maintenance = await db.buses.count_documents({"status": "MAINTENANCE"})
    total_drivers = await db.users.count_documents({"role": "DRIVER"})
    total_students = await db.users.count_documents({"role": "STUDENT"})
    active_trips = await db.trips.count_documents({"status": "ACTIVE"})
    completed_trips = await db.trips.count_documents({"status": "COMPLETED"})
    total_routes = await db.routes.count_documents({})
    return {
        "total_buses": total_buses, "active_buses": active_buses,
        "available_buses": total_buses - active_buses - maintenance,
        "maintenance_buses": maintenance,
        "total_drivers": total_drivers, "total_students": total_students,
        "active_trips": active_trips, "completed_trips": completed_trips,
        "total_routes": total_routes,
    }


# ---------- websocket ----------
@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket):
    await broadcaster.connect(ws)
    try:
        while True:
            # keep alive; we ignore inbound messages
            await ws.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(ws)
    except Exception:
        broadcaster.disconnect(ws)


# ---------- health ----------
@api.get("/")
async def root():
    return {"service": "College Bus Tracking", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await db.users.create_index("email", unique=True)
    await db.buses.create_index("bus_number", unique=True)
    await db.buses.create_index("registration_number", unique=True)
    await db.stops.create_index([("route_id", 1), ("stop_order", 1)])
    await db.locations.create_index([("trip_id", 1), ("timestamp", -1)])
    await seed_all(db)
    logger.info("Bus tracking backend ready.")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
