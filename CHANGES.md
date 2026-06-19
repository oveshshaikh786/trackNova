# IRCTC Project — Change Log & Documentation

> Every file touched, why it was changed, and how the system fits together.

---

## How to Run

### Backend (Spring Boot)
```bash
cd IRCTC
./gradlew bootRun
# Starts on http://localhost:8080
```

### Frontend (React)
```bash
cd react-UI/train-ticket-booking-ui
npm install
npm start
# Opens on http://localhost:3000
```

### Legacy CLI (optional)
```bash
./gradlew bootRun --args="--cli"
```

---

## System Architecture

```
Browser (React :3000)
        │
        │  HTTP / JSON
        ▼
Spring Boot REST API (:8080)
        │
        ├── UserController  → /api/*
        ├── UserBookingService
        ├── TrainService
        │
        └── localDb/
              ├── users.json   (user accounts + tickets)
              └── trains.json  (train routes + seat matrix)
```

**Auth flow (no JWT — simple userId session):**
1. User logs in → `POST /api/login` → backend validates BCrypt hash → returns `{ userId, name }`
2. Frontend stores `{ userId, name }` in `localStorage`
3. Every protected request sends `userId` as a request param or in the request body
4. Backend looks up the user by `userId` in `users.json`

> **JWT upgrade path:** When ready, replace the `userId` param with a `Authorization: Bearer <token>` header. The service layer doesn't change — only the controller and a new filter.

---

## REST API Reference

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| POST | `/api/signup` | `{ name, password }` | Register new user |
| POST | `/api/login` | `{ name, password }` | Login — returns `{ userId, name }` |
| GET | `/api/stations` | — | All available station names |
| GET | `/api/trains/search` | `?source=&destination=` | Trains on a route |
| GET | `/api/bookings` | `?userId=` | User's booked tickets |
| POST | `/api/book` | `{ userId, trainId, row, col }` | Book a seat |
| DELETE | `/api/cancel/{ticketId}` | `?userId=` | Cancel a booking |

---

## Backend Changes

### `App.java`
**Problem:** `SpringApplication.run()` is blocking — it starts Tomcat and never returns. All the CLI scanner code after it was dead code.

**Fix:** Added `--cli` flag check. Default (no flag) → Spring Boot. `--args="--cli"` → legacy CLI. They no longer share the same execution path.

Also added the missing `@SpringBootApplication` annotation (was imported but never placed on the class — Spring would not have started at all).

---

### New file: `entities/LoginRequest.java`
DTO received by `POST /api/login`. Contains `name` and `password`. Password is never stored or logged after validation.

---

### New file: `entities/LoginResponse.java`
DTO returned by `POST /api/login` on success. Contains `userId`, `name`, `message`. The frontend stores this in localStorage to identify the session.

---

### New file: `entities/BookingRequest.java`
DTO received by `POST /api/book`. Contains `userId`, `trainId`, `row`, `col`. Using trainId instead of a full Train object keeps the API surface clean — the backend resolves the train internally.

---

### `services/TrainService.java`
**Added:** `getTrainById(String trainId)` — looks up a train by ID. Required so the booking endpoint only needs a trainId from the frontend instead of the full serialised Train object.

---

### `services/UserBookingService.java` — Major refactor
**Problem (concurrency bug):** The service kept a `this.user` field that was set after login and reused across method calls. Spring's `@RestController` is a singleton — `this.user` is shared state across all concurrent HTTP requests. Two users logged in at the same time would read/write each other's data.

**Fix:** All REST-facing methods now accept `userId` as a parameter. The `this.user` field is kept **only** for the CLI methods (`fetchBookings()`, `cancelBooking()`, `bookTrainSeat()`) so `App.java` doesn't need to change.

**New methods:**
- `getBookingsByUserId(String userId)` — replaces `fetchBookings()` for REST
- `bookTrainSeatByRequest(String userId, String trainId, int row, int col)` — replaces `bookTrainSeat(Train, row, col)` for REST
- `cancelBookingByUserId(String ticketId, String userId)` — replaces `cancelBooking(String)` for REST

**signUp() hardening:** Now initialises `userId` (UUID) and `ticketsBooked` (empty list) when the caller (REST endpoint) omits them. Previously this caused a NullPointerException when `cancelBooking` called `getTicketsBooked().removeIf(...)`.

---

### `controllers/UserController.java` — Fully rewritten
Was only one endpoint (`/api/signup`). Now has all 7 endpoints documented in the REST API table above.

Each endpoint:
- Has a Javadoc comment explaining the contract
- Returns proper HTTP status codes (200, 400, 401, 404, 500)
- Delegates all logic to `UserBookingService` (controller does zero business logic)

---

## Frontend Changes

### `src/services/authService.js` — Rewritten
**Problems:**
- Called `/login` instead of `/api/login` (wrong path, 404 in production)
- No helpers for reading/writing localStorage

**Now provides:**
- `login(name, password)` → POST /api/login
- `signup(name, password)` → POST /api/signup
- `storeUser(user)` / `getStoredUser()` / `clearUser()` — localStorage helpers
- `isLoggedIn()` — boolean check used by ProtectedRoute and NavigationBar

---

### `src/services/trainService.js` — Implemented (was empty)
All train and booking API calls:
- `getStations()` → GET /api/stations
- `searchTrains(source, destination)` → GET /api/trains/search
- `fetchBookings(userId)` → GET /api/bookings
- `bookSeat(userId, trainId, row, col)` → POST /api/book
- `cancelBooking(ticketId, userId)` → DELETE /api/cancel/{ticketId}

---

### `src/App.js` — Rewritten
**Problems:**
- Duplicate `<Route path="/">` (React Router silently ignores the second)
- A JavaScript comment `//what the hell, why it's not getting it` written as JSX text (renders literally in the browser)
- No protected routes — any URL was accessible without login

**Now:**
- Clean route definitions with no duplicates
- `<ProtectedRoute>` wrapper: redirects to `/login` if not authenticated
- Routes: `/login`, `/signup`, `/search`, `/book`, `/bookings`
- Default `/` redirects to `/search` if logged in, `/login` if not

---

### `src/components/NavigationBar.js` — Implemented (was empty)
Shows:
- Logged-out: Login + Sign Up links
- Logged-in: Search Trains, My Bookings, username, Logout button
- Logout calls `clearUser()` then navigates to `/login`

---

### `src/components/LoginForm.js` — Rewritten
- Uses `authService.login()` (correct path, proper error handling)
- Shows loading state during the network call
- On success: calls `storeUser()` then navigates to `/search`
- Displays backend error messages (e.g. "Invalid username or password")

---

### `src/components/SignupForm.js` — Rewritten
**Problem:** Had a hardcoded `fetch("https://train-ticket-booking-backend.onrender.com/api/signup", ...)` — pointed at a dead Render.com deployment, not the local backend.

**Fix:** Uses `authService.signup()` which calls `http://localhost:8080/api/signup`.

---

### `src/pages/TrainSearchPage.js` — Implemented (was empty)
1. On mount: fetches stations from `/api/stations`, populates two dropdowns
2. On submit: calls `searchTrains(source, destination)`
3. Results rendered by `<TrainList>`
4. On train select: saves train + route to `sessionStorage`, navigates to `/book`

---

### `src/components/TrainList.js` — Implemented (was empty)
Renders each train as a card showing:
- Train ID + number
- Full route with station times (e.g. `bangalore (13:50) → gujarat (15:00) → delhi (18:30)`)
- "Select & Book Seat" button

---

### `src/pages/SeatBookingPage.js` — Implemented (was empty)
1. Reads selected train from `sessionStorage`
2. Shows `<SeatGrid>` — visual seat picker
3. On confirm: calls `bookSeat()` → POST /api/book
4. Updates local seat state immediately (optimistic UI) so the booked seat turns red without a page reload

---

### `src/components/SeatGrid.js` — Implemented (was empty)
Visual 2D grid of seats:
- Green = available (clickable)
- Red = booked (disabled)
- Blue = currently selected

---

### `src/pages/BookingsPage.js` — Implemented (was empty)
- Fetches all tickets on mount via `fetchBookings(userId)`
- Passes to `<BookingList>`
- Refreshes list after a successful cancel

---

### `src/components/BookingList.js` — Implemented (was empty)
Renders each ticket showing route, train, date, ticket ID.
Cancel button calls `DELETE /api/cancel/{ticketId}` with a confirmation dialog.

---

## Known Limitations (next steps)

| Area | Current | Better |
|------|---------|--------|
| Auth | userId in localStorage | JWT with expiry |
| DB | JSON files | PostgreSQL / H2 |
| Concurrency | Single file write (last write wins) | DB transactions |
| Seat booking | Source/dest hardcoded to first/last station | Let user pick journey segment |
| Docker | Dockerfile exists | Wire with docker-compose (Spring + React) |
| Validation | Minimal | Bean Validation (`@NotNull`, `@Size`) on DTOs |

---

## File Change Summary

```
Backend (Java)
├── App.java                              CHANGED  — separated CLI from Spring Boot
├── controllers/UserController.java       CHANGED  — 6 new endpoints added
├── services/UserBookingService.java      CHANGED  — stateless refactor, 3 new methods
├── services/TrainService.java            CHANGED  — added getTrainById()
├── entities/LoginRequest.java            NEW
├── entities/LoginResponse.java           NEW
└── entities/BookingRequest.java          NEW

Frontend (React)
├── src/App.js                            CHANGED  — clean routes + ProtectedRoute
├── src/services/authService.js           CHANGED  — fixed URLs + localStorage helpers
├── src/services/trainService.js          CHANGED  — fully implemented (was empty)
├── src/components/LoginForm.js           CHANGED  — uses authService, proper error handling
├── src/components/SignupForm.js          CHANGED  — removed hardcoded Render.com URL
├── src/components/NavigationBar.js       CHANGED  — implemented (was empty)
├── src/components/TrainList.js           CHANGED  — implemented (was empty)
├── src/components/SeatGrid.js            CHANGED  — implemented (was empty)
├── src/components/BookingList.js         CHANGED  — implemented (was empty)
├── src/pages/SignupPage.js               CHANGED  — implemented (was empty)
├── src/pages/TrainSearchPage.js          CHANGED  — implemented (was empty)
├── src/pages/SeatBookingPage.js          CHANGED  — implemented (was empty)
└── src/pages/BookingsPage.js             CHANGED  — implemented (was empty)
```
