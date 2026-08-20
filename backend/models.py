"""Pydantic models for the College Bus Tracking System."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


Role = Literal["ADMIN", "DRIVER", "STUDENT"]
BusStatus = Literal["ACTIVE", "INACTIVE", "MAINTENANCE"]
TripStatus = Literal["NOT_STARTED", "ACTIVE", "COMPLETED", "CANCELLED"]


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: Role
    phone: Optional[str] = None
    # driver
    license_number: Optional[str] = None
    # student
    student_id: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class RegisterStudentBody(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    student_id: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None


class CreateDriverBody(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    license_number: str


class UpdateUserBody(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    student_id: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None


class Bus(BaseModel):
    id: str = Field(default_factory=_uid)
    bus_number: str
    registration_number: str
    capacity: int
    status: BusStatus = "INACTIVE"
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


class BusCreate(BaseModel):
    bus_number: str
    registration_number: str
    capacity: int = Field(ge=1, le=200)
    status: BusStatus = "INACTIVE"


class BusUpdate(BaseModel):
    bus_number: Optional[str] = None
    registration_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[BusStatus] = None


class Stop(BaseModel):
    id: str = Field(default_factory=_uid)
    route_id: str
    stop_name: str
    latitude: float
    longitude: float
    stop_order: int


class StopCreate(BaseModel):
    stop_name: str
    latitude: float
    longitude: float
    stop_order: int


class StopUpdate(BaseModel):
    stop_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stop_order: Optional[int] = None


class Route(BaseModel):
    id: str = Field(default_factory=_uid)
    route_name: str
    description: Optional[str] = ""
    start_location: str
    end_location: str
    created_at: str = Field(default_factory=_now)


class RouteCreate(BaseModel):
    route_name: str
    description: Optional[str] = ""
    start_location: str
    end_location: str
    stops: Optional[List[StopCreate]] = None


class RouteUpdate(BaseModel):
    route_name: Optional[str] = None
    description: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None


class Assignment(BaseModel):
    id: str = Field(default_factory=_uid)
    bus_id: str
    driver_id: str
    route_id: str
    assigned_date: str = Field(default_factory=_now)
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"


class AssignmentCreate(BaseModel):
    bus_id: str
    driver_id: str
    route_id: str


class Trip(BaseModel):
    id: str = Field(default_factory=_uid)
    bus_id: str
    driver_id: str
    route_id: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: TripStatus = "NOT_STARTED"
    demo_mode: bool = False


class LocationPoint(BaseModel):
    id: str = Field(default_factory=_uid)
    trip_id: str
    latitude: float
    longitude: float
    timestamp: str = Field(default_factory=_now)


class LocationCreate(BaseModel):
    latitude: float
    longitude: float


class BoardingRequestCreate(BaseModel):
    stop_id: str


class ScanBody(BaseModel):
    bus_number: str
