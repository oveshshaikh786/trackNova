# 🚆 TrackNova

**America's most intelligent rail booking platform.**  
Full-stack train ticket booking system with AI delay prediction, live journey narration, real-time departure boards, and a complete admin suite.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tracknova--pink.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://tracknova-pink.vercel.app)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)

---

## 🌐 Live Demo

🔗 **[https://tracknova-pink.vercel.app](https://tracknova-pink.vercel.app)**

---

## ✨ Features

### Passenger Experience
- **Train Search** — search by origin, destination, date, and cabin class (Economy / Business / First)
- **Live Departure Board** — real-time board with flip-animation and auto-scrolling status ticker
- **Visual Seat Selection** — interactive seat map with class zones; booked seats locked in real time
- **Multi-Seat Booking** — select multiple seats in one transaction
- **Round-Trip Support** — book outbound and return in a single flow
- **Payment Flow** — mock checkout with promo code discount support
- **My Trips** — booking history, ticket cards with class-coloured gradients, cancel / track actions
- **Live Journey Tracking (WindowAI)** — real-time waypoint narration once a journey begins
- **PredictRail** — rule-based on-time probability badge on every train card before you book
- **Waitlist** — auto-join queue when a train is full; auto-promote + email on cancellation
- **Profile Page** — account info, role badge, password change

### Admin Suite
- **Trains** — create, edit, delete; set status (On Time / Delayed / Boarding / Cancelled); manage seats
- **Users** — view all users, suspend / reinstate accounts
- **Bookings** — full booking log with seat occupancy % per train
- **Revenue** — live revenue stats, top routes, booking trends (7-day window)
- **Promo Codes** — create / deactivate percentage or fixed-amount discounts
- **Announcements** — publish live announcements; appears as scrolling ticker above departure board

### Platform
- **JWT Authentication** — stateless auth, role-based access (USER / ADMIN)
- **Responsive Design** — mobile-friendly; login hero hidden on small screens, admin tabs scroll hidden
- **PostgreSQL** — fully persistent; JPA/Hibernate with deep-copy fix for nested seat arrays
- **Docker** — multi-stage Dockerfile; JRE-only runtime image for Railway

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (CRA), React Router v6, vanilla CSS + CSS-in-JS |
| Backend | Java 17, Spring Boot 3.0, Gradle (multi-project) |
| Database | PostgreSQL 16 + Spring Data JPA / Hibernate |
| Auth | JWT (jjwt 0.11.5) + Spring Security + BCrypt |
| Build | Gradle wrapper 8.14.1, `bootJar` fat JAR |
| Deploy | Railway (backend + PostgreSQL) · Vercel (frontend) |
| Containerisation | Docker multi-stage (eclipse-temurin:17-jdk-alpine → jre-alpine) |

---

## 🗂 Project Structure

```
trackNova/
├── Dockerfile                        # Multi-stage Docker build for Railway
├── railway.json                      # Railway deploy config
├── app/                              # Spring Boot backend (Gradle subproject)
│   └── src/main/java/org/example/
│       ├── controllers/              # REST endpoints
│       ├── services/                 # Business logic (booking, delay, waitlist, email)
│       ├── repositories/             # Spring Data JPA interfaces
│       ├── entities/                 # JPA entities (User, Train, Ticket, Waypoint, …)
│       ├── security/                 # JwtUtil, JwtAuthFilter, SecurityConfig
│       ├── converters/               # SeatsConverter (List<List<Integer>> ↔ JSON)
│       └── DataSeeder.java           # Seeds 28 trains + admin user on first boot
│
└── react-UI/train-ticket-booking-ui/
    └── src/
        ├── pages/                    # TrainSearch, SeatBooking, Payment, Bookings, Admin, …
        ├── components/               # NavigationBar, DepartureBoard, TrainList, …
        └── services/                 # API service layer (fetch)
```

---

## 🚀 Local Setup

### Prerequisites
- Java 17+
- Node 18+
- PostgreSQL 14+ (or use Docker)

### 1. Database

```sql
CREATE DATABASE tracknova;
```


### 2. Backend

Create `app/src/main/resources/application.properties` (gitignored — never commit it) using the keys listed in the [Environment Variables](#️-environment-variables) section below.

```bash
./gradlew :app:bootRun
# API runs on http://localhost:8080
# DataSeeder seeds 28 demo trains on first boot
```

### 3. Frontend

```bash
cd react-UI/train-ticket-booking-ui
echo "REACT_APP_API_URL=http://localhost:8080" > .env
npm install
npm start
# App runs on http://localhost:3000
```

---

## 🌐 Deployment

### Backend → Railway

1. Push repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set builder to **Dockerfile** (already configured via `railway.json`)
4. Add a **PostgreSQL** service in the same project
5. Railway auto-deploys on every push to `main`

### Frontend → Vercel

1. Import GitHub repo in Vercel
2. Set **Root Directory** to `react-UI/train-ticket-booking-ui`
3. Add `REACT_APP_API_URL` pointing to your Railway backend URL
4. Vercel auto-deploys on every push to `main`

---

## 🔑 Key Technical Notes

**Seat persistence fix** — Hibernate dirty-check on `@Convert` columns compares object references. Mutating the seat `List<List<Integer>>` in-place looks unchanged to Hibernate, causing lost updates. All booking mutations deep-copy the outer list first:
```java
List<List<Integer>> freshSeats = seats.stream()
    .map(ArrayList::new)
    .collect(Collectors.toList());
freshSeats.get(row).set(col, 1);
train.setSeats(freshSeats);
```

**Stateless JWT auth** — Every request carries a signed bearer token. `JwtAuthFilter` validates signature + expiry and sets the `SecurityContext` — no session store needed. Scales horizontally without sticky sessions.

**PredictRail** — Spring service that scores delay risk (LOW / MEDIUM / HIGH) + on-time probability using route history, delay minutes, time-of-day, and status flags. Displayed as a badge on every train card before booking.

**WindowAI** — Waypoint controller returns ordered station list with estimated arrival times. `LiveJourneyPage` polls every 60 s and renders a scrolling timeline with a "NOW" marker on the current segment.

**Docker multi-stage build** — Builder stage uses `eclipse-temurin:17-jdk-alpine` to run `./gradlew :app:bootJar`. Runtime stage uses `eclipse-temurin:17-jre-alpine` (no JDK, smaller image). The fat JAR is copied between stages.

---

## 📄 License

MIT — free to use as a portfolio reference or starting point.
