# CampusRoute — Product Requirements Document

## Original Problem
Build a complete College Bus Tracking System for a 5th-semester BCA project with 3 roles (Admin/Driver/Student), real-time GPS via WebSockets, Leaflet + OpenStreetMap, demo simulation mode along route stops, JWT auth + bcrypt, role-based APIs, and beautiful production-style UI.

## Stack (user choices)
- FastAPI + MongoDB + native WebSockets + React 19 + Leaflet
- Demo simulation mode (bus auto-moves along Nagpur route stops)
- Nagpur, India coordinates seeded

## User Personas
- **Admin** (transport office): manages fleet, drivers, students, routes/stops, assignments, monitors live trips + history.
- **Driver**: sees assigned bus/route, starts/ends trip, streams GPS (real or demo).
- **Student**: sees available buses, tracks live bus on map with next stop + ETA.

## Core Requirements (static)
- JWT auth (bcrypt) + role guard (`require_role`).
- CRUD for buses, drivers, students, routes, stops, assignments.
- Trip lifecycle with location broadcasting (WebSocket `/api/ws`).
- Leaflet map with bus marker, route polyline, ordered stops, next-stop detection, ETA.
- Demo simulation (`simulation.py`) interpolates positions between stops.

## What's Implemented (2026-08-20)
- Backend: auth (login/register/me/logout), buses CRUD, drivers CRUD, students list/delete, routes CRUD + stops CRUD, assignments CRUD, trip start/end + location ingestion, stats overview, WebSocket broadcaster.
- Seeded: admin (awaleadarsh45@gmail.com), 3 drivers, 5 students, 4 buses, 3 Nagpur routes with ordered stops, 1 default assignment (Rahul + BUS-01 + Route A).
- Frontend: Landing, Login (with demo quick-fill), Register (student), Admin (Dashboard, Buses, Drivers, Students, Routes+Stops, Assignments, Live Tracking, Trip History), Driver console (start/end with demo toggle, next stop, elapsed time), Student (available buses grid + full-screen Leaflet tracking with glass info card).
- Verified: E2E flow driver-start → student-track → driver-end → admin-history all working with WebSocket live updates.

## Prioritized Backlog
- **P1**: Real-GPS mode indicator on student page (live vs demo). Search/pagination on admin tables. Editable driver/route fields inline.
- **P2**: Auth password reset, forgot password flow, per-college multi-tenancy, better ETA via OSRM.
- **P3**: Native push notifications for students boarding, PWA install, offline map cache.

## Known Limitations
- ETA uses fixed 30 km/h assumption (labelled approximate in UI).
- Demo simulation interpolates linearly (not road-following).
- No password reset (out of scope for MVP).

## Files
- Backend: `/app/backend/{server.py, auth.py, models.py, seed.py, simulation.py, .env}`
- Frontend: `/app/frontend/src/{App.js, pages/*, components/*, lib/*, contexts/*}`
- Docs: `/app/README.md`, `/app/PROJECT_REPORT.md`
