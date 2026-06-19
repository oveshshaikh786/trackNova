# 🚆 TrackNova

**America's most intelligent rail booking platform.**  
Full-stack train ticket booking system with AI delay prediction, live journey narration, real-time departure boards, and a complete admin suite.

---

## ✨ Features

### Passenger Experience
- **Train Search** — search by origin, destination, date, and cabin class (Economy / Business / First)
- **Live Departure Board** — real-time board with flip-animation and auto-scrolling status ticker
- **Visual Seat Selection** — interactive seat map with class zones; booked seats locked in real time
- **Multi-Seat Booking** — select multiple seats in one transaction
- **Round-Trip Support** — book outbound and return in a single flow
- **Payment Flow** — Stripe-ready checkout (mock mode included); promo code support
- **My Trips** — booking history, ticket cards with class-coloured gradients, cancel / track actions
- **Live Journey Tracking (WindowAI)** — real-time waypoint narration once a journey begins
- **PredictRail** — ML-powered on-time probability badge on every train card
- **Waitlist** — auto-join queue when a train is full; auto-promote on cancellation
- **Profile Page** — account info, role badge, password change

### Admin Suite
- **Trains** — create, edit, delete; set status (On Time / Delayed / Boarding / Cancelled); manage seats
- **Users** — view all users, suspend / reinstate accounts
- **Bookings** — full booking log with seat occupancy % per train
- **Revenue** — live revenue stats, top routes, booking trends
- **Promo Codes** — create / deactivate percentage or fixed discounts
- **Announcements** — publish live announcements; appears as scrolling ticker above departure board

### Platform
- **JWT Authentication** — stateless auth, role-based access (USER / ADMIN)
- **Responsive Design** — mobile-first; hamburger sidebar on small screens
- **Light Theme** — professional indigo / amber / green / red palette
- **PostgreSQL** — fully persistent; JPA/Hibernate with deep-copy dirty-check fix for nested seat arrays

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (CRA), React Router v7, vanilla CSS-in-JS |
| Backend | Java 17, Spring Boot 3, Gradle |
| Database | PostgreSQL + JPA / Hibernate |
| Auth | JWT (jjwt) |
| ML / AI | PredictRail delay model (custom Spring service) |
| Deploy | Railway (backend + DB) · Vercel (frontend) |

---

## 🗂 Project Structure

```
trackNova/
├── app/                          # Spring Boot backend
│   └── src/main/java/org/example/
│       ├── controllers/          # REST endpoints
│       ├── services/             # Business logic
│       ├── repositories/         # JPA repos
│       ├── entities/             # JPA entities (User, Train, Booking, …)
│       ├── security/             # JWT filter + config
│       ├── converters/           # SeatsConverter (List<List<Integer>> ↔ JSON)
│       └── DataSeeder.java       # Demo data seeder
│
└── react-UI/train-ticket-booking-ui/
    └── src/
        ├── pages/                # TrainSearch, SeatBooking, Payment, Bookings, Admin, …
        ├── components/           # NavigationBar, DepartureBoard, TrainList, …
        └── services/             # API service layer (axios)
```

---

## 🚀 Local Setup

### Prerequisites
- Java 17+
- Node 18+
- PostgreSQL 14+

### 1. Database

```sql
CREATE DATABASE tracknova;
```

### 2. Backend

```bash
# In project root
cp app/src/main/resources/application.properties.example \
   app/src/main/resources/application.properties

# Edit application.properties:
# spring.datasource.url=jdbc:postgresql://localhost:5432/tracknova
# spring.datasource.username=YOUR_PG_USER
# spring.datasource.password=YOUR_PG_PASSWORD
# jwt.secret=YOUR_JWT_SECRET

./gradlew bootRun
# Runs on http://localhost:8080
# DataSeeder auto-creates admin + demo trains on first start
```

Default admin credentials seeded on first run:  
**Username:** `admin` · **Password:** `admin123`

### 3. Frontend

```bash
cd react-UI/train-ticket-booking-ui
npm install
npm start
# Runs on http://localhost:3000
```

---

## ⚙️ Environment Variables

### Backend (`application.properties`)
| Key | Description |
|-----|-------------|
| `spring.datasource.url` | PostgreSQL JDBC URL |
| `spring.datasource.username` | DB username |
| `spring.datasource.password` | DB password |
| `jwt.secret` | JWT signing secret (min 32 chars) |
| `stripe.secret.key` | Stripe secret key (optional; mock mode if absent) |

### Frontend (`.env`)
| Key | Description |
|-----|-------------|
| `REACT_APP_API_URL` | Backend base URL (e.g. `https://your-api.railway.app`) |

---

## 🌐 Deployment

### Backend → Railway
```bash
# Push to GitHub; connect repo in Railway
# Set env vars in Railway dashboard
# railway.json + Procfile already configured
```

### Frontend → Vercel
```bash
# Connect GitHub repo in Vercel
# Set REACT_APP_API_URL to Railway backend URL
# Build command: npm run build  |  Output: build/
```

---

## 🔑 Key Technical Notes

**Seat persistence fix** — Hibernate dirty-check on `@Convert` columns compares object references. Mutating `List<List<Integer>>` in-place looks unchanged to Hibernate. All booking mutations deep-copy the outer list first:
```java
List<List<Integer>> freshSeats = seats.stream()
    .map(ArrayList::new)
    .collect(Collectors.toList());
freshSeats.get(row).set(col, 1);
train.setSeats(freshSeats);
```

**PredictRail** — Spring service that scores delay risk (LOW / MEDIUM / HIGH) + on-time probability using route history, delay minutes, and status flags. Result displayed as a badge on every train card before booking.

**WindowAI** — Waypoint controller returns ordered station list with estimated arrival times. `LiveJourneyPage` polls every 30 s and renders a scrolling timeline with a "NOW" marker on the current station.

---

## 📄 License

MIT — feel free to use as a portfolio reference or starting point for your own project.
