# CampusRoute — BCA Final Year Project Report

## 1. Abstract
CampusRoute is a real-time college bus tracking system that lets a college administer its fleet, allow drivers to stream their bus location, and enable students to view their bus on a live map with next-stop information and approximate ETA. The system uses FastAPI, MongoDB, WebSockets, React and Leaflet/OpenStreetMap.

## 2. Introduction
College buses often run late without students knowing where they are. Missed buses waste time and create stress. CampusRoute solves this by giving students a live map of their bus, drivers a simple 'Start / End Trip' console, and admins full CRUD control over buses, drivers, routes and stops.

## 3. Problem Statement
Students have no reliable way to know the current location of the college bus. Existing WhatsApp-based updates are manual, delayed and inconsistent. Colleges also lack a central tool to manage buses, drivers, routes and trip records.

## 4. Objectives
- Provide real-time, no-refresh tracking of college buses.
- Manage buses, drivers, students, routes, stops and assignments.
- Record trips (start, end, duration) for reporting.
- Support demo simulation for viva when a real bus cannot be moved.

## 5. Existing System
- Manual coordination via WhatsApp groups.
- Paper-based route and driver management.
- No trip history, no live map.

## 6. Proposed System
A web application with three role-based dashboards (Admin/Driver/Student), real-time WebSocket broadcasting, Leaflet map, next-stop detection and an approximate ETA calculation.

## 7. Scope
- Single-college deployment.
- Web-based; runs in any modern browser.
- Uses the browser Geolocation API on the driver's device for real GPS; demo mode simulates movement.

## 8. Functional Requirements
- User login/registration (JWT + bcrypt).
- Role-based access: Admin, Driver, Student.
- CRUD for buses, drivers, students, routes, stops, assignments.
- Trip lifecycle: start, location streaming, end.
- Live map for admin (all active buses) and student (one bus).
- Trip history with filters.

## 9. Non-Functional Requirements
- Responsive on mobile/tablet/desktop.
- Secure passwords (bcrypt hashing), JWT auth, protected APIs.
- Real-time updates without page refresh.
- Graceful error handling and user-friendly messages.

## 10. Hardware Requirements
- Server with 1 vCPU, 1 GB RAM (adequate for a small college).
- Modern smartphone or laptop for driver GPS.

## 11. Software Requirements
- Python 3.11+, FastAPI, Motor.
- Node.js 18+, React 19, Tailwind.
- MongoDB 6+.

## 12. System Architecture
- **Client (React)** — role-based dashboards, Leaflet map, WebSocket client.
- **API (FastAPI)** — REST endpoints under `/api/*`, WebSocket at `/api/ws`.
- **Database (MongoDB)** — collections: users, buses, routes, stops, assignments, trips, locations.
- **Simulation module** — async task per active trip, interpolates between ordered stops.

## 13. Use-Case Diagram (Description)
- **Admin** — Login, Manage Buses, Manage Drivers, Manage Routes/Stops, Assign Bus+Driver+Route, View Live, View History.
- **Driver** — Login, View Assignment, Start Trip, Share Location, End Trip.
- **Student** — Register/Login, View Available Buses, Track Bus, View Next Stop/ETA.

## 14. Data Flow Diagram (Description)
- Level 0: Driver → System → Student (live location).
- Level 1: Driver POSTs location → Server persists + broadcasts via WebSocket → Student React app updates map marker.

## 15. ER Diagram (Description)
- `users(id, name, email, password_hash, role)` 1—1 driver profile fields (license), 1—1 student profile fields.
- `routes(id, route_name, ...)` 1—N `stops(id, route_id, stop_order, lat, lng)`.
- `assignments(id, bus_id, driver_id, route_id)` links three entities.
- `trips(id, bus_id, driver_id, route_id, start_time, end_time, status)` 1—N `locations(id, trip_id, lat, lng, timestamp)`.

## 16. Database Design
See collections above. Indexes: `users.email` (unique), `buses.bus_number` (unique), `buses.registration_number` (unique), `stops(route_id, stop_order)`, `locations(trip_id, timestamp desc)`.

## 17. Module Description
- **Auth module** — JWT + bcrypt, seed admin from env, role dependency `require_role`.
- **Fleet module** — CRUD for buses, drivers, students.
- **Network module** — CRUD for routes and ordered stops.
- **Assignments module** — links bus + driver + route.
- **Trip module** — start/end trip, GPS ingestion, simulation runner.
- **Broadcaster** — in-process WebSocket fan-out.
- **Map module (client)** — Leaflet layer, animated marker, dark tile filter.

## 18. Testing Strategy
- **Unit-level (curl):** each REST endpoint tested for happy path + validation errors.
- **Integration:** login → CRUD → assign → start trip → location broadcast → end trip → history.
- **UI:** manual and automated Playwright flows across three roles.
- **Realtime:** open Admin Live and Student Track tabs; verify no-refresh marker updates.

## 19. Future Enhancements
- Push notifications, boarding request from students, better ETA (OSRM), attendance tracking, multi-tenant, native app.

## 20. Conclusion
CampusRoute demonstrates a complete, production-style flow — authentication, RBAC, CRUD, real-time messaging and mapping — while remaining understandable and defensible as a 5th-semester BCA project.
