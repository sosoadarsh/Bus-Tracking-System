"""Seed script - creates admin, drivers, students, buses, routes/stops, assignments. Idempotent."""
import os
from datetime import datetime, timezone
from auth import hash_password, verify_password

# Nagpur, India realistic coordinates
ROUTES_SEED = [
    {
        "route_name": "Route A - North Campus Loop",
        "description": "Sitabuldi → Civil Lines → Medical Sq → University Campus",
        "start_location": "Sitabuldi",
        "end_location": "University Campus",
        "stops": [
            {"stop_name": "Sitabuldi", "latitude": 21.1458, "longitude": 79.0882, "stop_order": 1},
            {"stop_name": "Civil Lines", "latitude": 21.1600, "longitude": 79.0790, "stop_order": 2},
            {"stop_name": "Medical Square", "latitude": 21.1470, "longitude": 79.0710, "stop_order": 3},
            {"stop_name": "Law College Sq", "latitude": 21.1330, "longitude": 79.0530, "stop_order": 4},
            {"stop_name": "University Campus", "latitude": 21.1237, "longitude": 79.0410, "stop_order": 5},
        ],
    },
    {
        "route_name": "Route B - East Line",
        "description": "Kamptee Rd → Automotive Sq → Nagpur Station → Dhantoli",
        "start_location": "Kamptee Road",
        "end_location": "Dhantoli",
        "stops": [
            {"stop_name": "Kamptee Road", "latitude": 21.1900, "longitude": 79.1150, "stop_order": 1},
            {"stop_name": "Automotive Square", "latitude": 21.1750, "longitude": 79.1090, "stop_order": 2},
            {"stop_name": "Nagpur Station", "latitude": 21.1530, "longitude": 79.0940, "stop_order": 3},
            {"stop_name": "Dhantoli", "latitude": 21.1370, "longitude": 79.0860, "stop_order": 4},
        ],
    },
    {
        "route_name": "Route C - South Ring",
        "description": "Manish Nagar → Trimurti Nagar → Wardha Rd → Ajni",
        "start_location": "Manish Nagar",
        "end_location": "Ajni",
        "stops": [
            {"stop_name": "Manish Nagar", "latitude": 21.0930, "longitude": 79.0620, "stop_order": 1},
            {"stop_name": "Trimurti Nagar", "latitude": 21.1050, "longitude": 79.0680, "stop_order": 2},
            {"stop_name": "Wardha Road", "latitude": 21.1160, "longitude": 79.0730, "stop_order": 3},
            {"stop_name": "Ajni", "latitude": 21.1280, "longitude": 79.0810, "stop_order": 4},
        ],
    },
]

BUSES_SEED = [
    {"bus_number": "BUS-01", "registration_number": "MH-31-AA-1001", "capacity": 40, "status": "INACTIVE"},
    {"bus_number": "BUS-02", "registration_number": "MH-31-AA-1002", "capacity": 45, "status": "INACTIVE"},
    {"bus_number": "BUS-03", "registration_number": "MH-31-AA-1003", "capacity": 50, "status": "INACTIVE"},
    {"bus_number": "BUS-04", "registration_number": "MH-31-AA-1004", "capacity": 40, "status": "MAINTENANCE"},
]

DRIVERS_SEED = [
    {"name": "Rahul Sharma", "email": "rahul@college.edu", "password": "driver123", "phone": "+91-9876543210", "license_number": "MH31-DL-2020-001"},
    {"name": "Suresh Patil", "email": "suresh@college.edu", "password": "driver123", "phone": "+91-9876543211", "license_number": "MH31-DL-2019-045"},
    {"name": "Ganesh Kale", "email": "ganesh@college.edu", "password": "driver123", "phone": "+91-9876543212", "license_number": "MH31-DL-2021-102"},
]

STUDENTS_SEED = [
    {"name": "Priya Deshmukh", "email": "priya@college.edu", "password": "student123", "student_id": "BCA22-01", "department": "BCA", "year": "3rd"},
    {"name": "Amit Verma", "email": "amit@college.edu", "password": "student123", "student_id": "BCA22-02", "department": "BCA", "year": "3rd"},
    {"name": "Sneha Iyer", "email": "sneha@college.edu", "password": "student123", "student_id": "BCA22-03", "department": "BCA", "year": "3rd"},
    {"name": "Karan Joshi", "email": "karan@college.edu", "password": "student123", "student_id": "BCA22-04", "department": "BCA", "year": "3rd"},
    {"name": "Nikita Rao", "email": "nikita@college.edu", "password": "student123", "student_id": "BCA22-05", "department": "BCA", "year": "3rd"},
]


async def seed_all(db):
    import uuid
    now = datetime.now(timezone.utc).isoformat()

    # --- Admin ---
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin_name = os.environ.get("ADMIN_NAME", "Admin")

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": admin_name, "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "ADMIN",
            "phone": None, "created_at": now,
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # --- Drivers ---
    for d in DRIVERS_SEED:
        if await db.users.find_one({"email": d["email"]}):
            continue
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": d["name"], "email": d["email"],
            "password_hash": hash_password(d["password"]), "role": "DRIVER",
            "phone": d["phone"], "license_number": d["license_number"], "created_at": now,
        })

    # --- Students ---
    for s in STUDENTS_SEED:
        if await db.users.find_one({"email": s["email"]}):
            continue
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": s["name"], "email": s["email"],
            "password_hash": hash_password(s["password"]), "role": "STUDENT",
            "student_id": s["student_id"], "department": s["department"], "year": s["year"],
            "created_at": now,
        })

    # --- Buses ---
    for b in BUSES_SEED:
        if await db.buses.find_one({"bus_number": b["bus_number"]}):
            continue
        await db.buses.insert_one({
            "id": str(uuid.uuid4()), **b, "created_at": now, "updated_at": now,
        })

    # --- Routes + stops ---
    for r in ROUTES_SEED:
        if await db.routes.find_one({"route_name": r["route_name"]}):
            continue
        route_id = str(uuid.uuid4())
        await db.routes.insert_one({
            "id": route_id, "route_name": r["route_name"], "description": r["description"],
            "start_location": r["start_location"], "end_location": r["end_location"],
            "created_at": now,
        })
        for stop in r["stops"]:
            await db.stops.insert_one({"id": str(uuid.uuid4()), "route_id": route_id, **stop})

    # --- One default assignment: first driver + first bus + first route ---
    if await db.assignments.count_documents({}) == 0:
        first_driver = await db.users.find_one({"role": "DRIVER"})
        first_bus = await db.buses.find_one({})
        first_route = await db.routes.find_one({})
        if first_driver and first_bus and first_route:
            await db.assignments.insert_one({
                "id": str(uuid.uuid4()),
                "bus_id": first_bus["id"], "driver_id": first_driver["id"], "route_id": first_route["id"],
                "assigned_date": now, "status": "ACTIVE",
            })

    # Write test credentials
    creds_path = "/app/memory/test_credentials.md"
    os.makedirs(os.path.dirname(creds_path), exist_ok=True)
    with open(creds_path, "w") as f:
        f.write(f"""# Test Credentials — College Bus Tracking

## Admin
- Email: `{admin_email}`
- Password: `{admin_password}`
- Role: ADMIN

## Drivers (password: `driver123`)
- rahul@college.edu (Rahul Sharma)
- suresh@college.edu (Suresh Patil)
- ganesh@college.edu (Ganesh Kale)

## Students (password: `student123`)
- priya@college.edu, amit@college.edu, sneha@college.edu, karan@college.edu, nikita@college.edu

## Auth endpoints
- POST /api/auth/login
- POST /api/auth/register  (STUDENT self-registration only)
- GET  /api/auth/me
- POST /api/auth/logout
""")
