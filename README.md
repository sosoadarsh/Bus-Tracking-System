# CampusRoute — College Bus Tracking System

A full-stack, real-time College Bus Tracking System built as a 5th-semester BCA project.
Admins manage the fleet, drivers stream their bus location, and students track their bus live on OpenStreetMap.

## ✨ Features
- Three roles: **ADMIN**, **DRIVER**, **STUDENT** with JWT + bcrypt auth and route guards.
- Full CRUD for **Buses, Drivers, Students, Routes, Stops, Assignments**.
- **Real-time GPS broadcasting** over WebSockets (`/api/ws`).
- **Demo simulation mode** — bus moves automatically along the route (perfect for viva demonstrations without a real bus).
- **Real GPS mode** — driver browser `watchPosition` pushes updates every few seconds.
- **Leaflet + OpenStreetMap** map with animated bus marker, route polyline, ordered stops.
- **Next-stop detection + approximate ETA** based on distance and average city speed.
- **Admin Live Tracking** page: all active buses with live marker updates.
- **Trip History** with status filters, durations, timestamps.
- Beautiful Swiss/high-contrast UI, dark-mode-tinted map tiles, glassmorphism info card, framer-free micro-interactions.

## 🧱 Tech Stack
- **Frontend:** React 19 + Tailwind + Shadcn UI + Leaflet + Sonner (toasts) + React Router v7.
- **Backend:** FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + native WebSockets.
- **Database:** MongoDB (collections mirror the requested MySQL schema — `users`, `buses`, `routes`, `stops`, `assignments`, `trips`, `locations`).

## 🚀 Run
Everything is pre-wired on Emergent. Backend runs on `:8001`, frontend on `:3000`, hot-reload enabled.

Backend env (`/app/backend/.env`): `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
Frontend env (`/app/frontend/.env`): `REACT_APP_BACKEND_URL`.

## 🔑 Demo Accounts
| Role    | Email                        | Password    |
|---------|------------------------------|-------------|
| Admin   | awaleadarsh45@gmail.com      | admin123    |
| Driver  | rahul@college.edu            | driver123   |
| Student | priya@college.edu            | student123  |

(2 more drivers, 4 more students available — see `/app/memory/test_credentials.md`.)

## 🗺️ Demo Flow (viva-ready)
1. Login as **Admin** → dashboard shows fleet stats. Everything is pre-seeded (Nagpur routes A/B/C, BUS-01..04, 3 drivers, 5 students, 1 default assignment).
2. Login as **Driver** (`rahul@college.edu`) in a second tab. Toggle **Demo simulation** ON. Click **START TRIP**.
3. In a third tab, login as **Student** (`priya@college.edu`) → BUS-01 appears with a **LIVE** badge → click **Track live**.
4. The bus marker moves along the Nagpur route stops in real time; next stop and ETA update automatically.
5. Driver clicks **END TRIP** → trip becomes COMPLETED in Admin → Trip History.

## 📡 API Overview
Auth: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout`.
Buses: `GET|POST /api/buses`, `PUT|DELETE /api/buses/:id`.
Drivers: `GET|POST /api/drivers`, `PUT|DELETE /api/drivers/:id`.
Students: `GET|DELETE /api/students[/id]`.
Routes: `GET|POST /api/routes`, `GET|PUT|DELETE /api/routes/:id`, `POST /api/routes/:routeId/stops`, `PUT|DELETE /api/stops/:id`.
Assignments: `GET|POST /api/assignments`, `DELETE /api/assignments/:id`.
Trips: `POST /api/trips/start`, `POST /api/trips/:id/end`, `GET /api/trips[?status=]`, `GET /api/trips/active`, `GET /api/trips/:id`, `POST /api/trips/:id/location`, `GET /api/trips/:id/location`.
Stats: `GET /api/stats/overview`.
Realtime: `WS /api/ws` → broadcasts `location:update`, `trip:started`, `trip:ended`.

## 🧯 Known Limitations
- ETA uses a fixed 30 km/h assumption (labeled "approximate" in the UI).
- Demo simulation interpolates linearly between stops — good enough for viva, not for production.
- No SMS/email notifications.

## 🛣️ Future Enhancements
- Live student boarding requests, driver-side push notifications, offline caching, better ETA using OSRM/route service, per-college multi-tenancy.

See also: `PROJECT_REPORT.md` for BCA-style project report content.
