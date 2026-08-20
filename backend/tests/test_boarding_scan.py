"""Backend tests for boarding requests, QR scan attendance, and admin endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://route-scout-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("awaleadarsh45@gmail.com", "admin123")
DRIVER = ("rahul@college.edu", "driver123")
DRIVER2 = ("suresh@college.edu", "driver123")
STUDENT = ("priya@college.edu", "student123")
STUDENT2 = ("amit@college.edu", "student123")


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens():
    return {
        "admin": login(*ADMIN),
        "driver": login(*DRIVER),
        "driver2": login(*DRIVER2),
        "student": login(*STUDENT),
        "student2": login(*STUDENT2),
    }


@pytest.fixture(scope="module")
def active_trip(tokens):
    """Ensure exactly one active trip for driver rahul (BUS-01)."""
    # End any existing active trip for rahul
    trips = requests.get(f"{API}/trips?status=ACTIVE", headers=H(tokens["driver"])).json()
    for t in trips:
        requests.post(f"{API}/trips/{t['id']}/end", headers=H(tokens["driver"]))
    # Fetch driver assignment
    assigns = requests.get(f"{API}/assignments", headers=H(tokens["driver"])).json()
    assert assigns, "driver has no assignment"
    aid = assigns[0]["id"]
    r = requests.post(f"{API}/trips/start", headers=H(tokens["driver"]),
                      json={"assignment_id": aid, "demo_mode": True})
    assert r.status_code == 200, r.text
    trip = r.json()
    yield trip
    requests.post(f"{API}/trips/{trip['id']}/end", headers=H(tokens["driver"]))


# ---------- boarding requests ----------
class TestBoardingRequests:
    def test_create_valid(self, tokens, active_trip):
        trip_full = requests.get(f"{API}/trips/{active_trip['id']}", headers=H(tokens["student"])).json()
        stop_id = trip_full["stops"][0]["id"]
        r = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests",
                          headers=H(tokens["student"]), json={"stop_id": stop_id})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["stop_id"] == stop_id
        assert d["student_id"]
        self.first_req_id = d["id"]

    def test_duplicate_returns_same(self, tokens, active_trip):
        trip_full = requests.get(f"{API}/trips/{active_trip['id']}", headers=H(tokens["student"])).json()
        stop_id = trip_full["stops"][0]["id"]
        r1 = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests",
                           headers=H(tokens["student"]), json={"stop_id": stop_id}).json()
        r2 = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests",
                           headers=H(tokens["student"]), json={"stop_id": stop_id}).json()
        assert r1["id"] == r2["id"], "duplicate pending should be idempotent"

    def test_bad_stop(self, tokens, active_trip):
        r = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests",
                          headers=H(tokens["student"]), json={"stop_id": "nonexistent-stop"})
        assert r.status_code == 400

    def test_no_active_trip(self, tokens):
        r = requests.post(f"{API}/trips/no-such-trip/boarding-requests",
                          headers=H(tokens["student"]), json={"stop_id": "x"})
        assert r.status_code == 404

    def test_driver_own_list(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/boarding-requests",
                         headers=H(tokens["driver"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "items" in d and "by_stop" in d
        assert len(d["items"]) >= 1
        assert len(d["by_stop"]) >= 1
        assert "pending" in d["by_stop"][0]

    def test_other_driver_forbidden(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/boarding-requests",
                         headers=H(tokens["driver2"]))
        assert r.status_code == 403

    def test_student_sees_only_own(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/boarding-requests",
                         headers=H(tokens["student"]))
        assert r.status_code == 200
        d = r.json()
        # all items belong to this student
        for it in d["items"]:
            assert it["student_name"]

    def test_acknowledge_flips_status(self, tokens, active_trip):
        lst = requests.get(f"{API}/trips/{active_trip['id']}/boarding-requests",
                           headers=H(tokens["driver"])).json()
        pending = [i for i in lst["items"] if i["status"] == "pending"]
        assert pending
        rid = pending[0]["id"]
        r = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests/{rid}/acknowledge",
                          headers=H(tokens["driver"]))
        assert r.status_code == 200
        # verify
        lst2 = requests.get(f"{API}/trips/{active_trip['id']}/boarding-requests",
                            headers=H(tokens["driver"])).json()
        target = next(i for i in lst2["items"] if i["id"] == rid)
        assert target["status"] == "acknowledged"

    def test_ack_forbidden_for_student(self, tokens, active_trip):
        r = requests.post(f"{API}/trips/{active_trip['id']}/boarding-requests/xxx/acknowledge",
                          headers=H(tokens["student"]))
        assert r.status_code == 403


# ---------- QR scan / attendance ----------
class TestScan:
    def test_invalid_bus(self, tokens):
        r = requests.post(f"{API}/attendance/scan", headers=H(tokens["student"]),
                          json={"bus_number": "NOPE-999"})
        assert r.status_code == 404

    def test_scan_and_duplicate(self, tokens, active_trip):
        bus = requests.get(f"{API}/trips/{active_trip['id']}", headers=H(tokens["student"])).json()["bus"]
        bus_number = bus["bus_number"]
        # use student2 to avoid collision with other tests
        r1 = requests.post(f"{API}/attendance/scan", headers=H(tokens["student2"]),
                           json={"bus_number": bus_number})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["ok"] is True
        assert d1["bus_number"] == bus_number
        # Second scan
        r2 = requests.post(f"{API}/attendance/scan", headers=H(tokens["student2"]),
                           json={"bus_number": bus_number})
        assert r2.status_code == 200
        assert r2.json()["already"] is True

    def test_bus_without_active_trip(self, tokens):
        # Find any bus not currently on active trip
        buses = requests.get(f"{API}/buses", headers=H(tokens["student"])).json()
        trips = requests.get(f"{API}/trips?status=ACTIVE", headers=H(tokens["admin"])).json()
        active_bus_ids = {t["bus_id"] for t in trips}
        idle = next((b for b in buses if b["id"] not in active_bus_ids), None)
        assert idle, "no idle bus for test"
        r = requests.post(f"{API}/attendance/scan", headers=H(tokens["student"]),
                          json={"bus_number": idle["bus_number"]})
        assert r.status_code == 409

    def test_trip_attendance_driver(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/attendance",
                         headers=H(tokens["driver"]))
        assert r.status_code == 200
        d = r.json()
        assert "count" in d and "items" in d
        assert d["count"] >= 1

    def test_trip_attendance_other_driver_forbidden(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/attendance",
                         headers=H(tokens["driver2"]))
        assert r.status_code == 403

    def test_trip_attendance_admin(self, tokens, active_trip):
        r = requests.get(f"{API}/trips/{active_trip['id']}/attendance",
                         headers=H(tokens["admin"]))
        assert r.status_code == 200
