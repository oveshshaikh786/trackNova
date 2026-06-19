# TrackNova — Deployment Guide

## Architecture

```
Vercel (React)  →  Railway (Spring Boot)  →  Railway PostgreSQL
```

---

## Backend — Railway

### 1. Create Railway project
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repository, root directory `/` (uses `railway.json`)

### 2. Add PostgreSQL
In the Railway project → **+ New** → **Database** → **PostgreSQL**

Railway auto-sets `DATABASE_URL` (postgres:// format). Spring Boot needs it in JDBC format — set the env vars below manually.

### 3. Set environment variables (Railway → Variables tab)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://<host>:<port>/<db>` (from Railway Postgres "Connect" tab, JDBC URL) |
| `DB_DRIVER` | `org.postgresql.Driver` |
| `DB_USERNAME` | from Railway Postgres credentials |
| `DB_PASSWORD` | from Railway Postgres credentials |
| `DB_DIALECT` | `org.hibernate.dialect.PostgreSQLDialect` |
| `JWT_SECRET` | any random 32+ char string, e.g. `openssl rand -base64 32` |
| `PORT` | `8080` (Railway sets this automatically) |

### 4. Deploy
Push to main — Railway builds with `./gradlew :app:bootJar -x test` and starts the jar.

### 5. Health check
Visit `https://<your-railway-url>/actuator/health` — should return `{"status":"UP"}`.

> **Note:** Add `spring-boot-starter-actuator` to `build.gradle` for the health endpoint,
> or remove `healthcheckPath` from `railway.json` if you prefer not to.

---

## Frontend — Vercel

### 1. Import project
Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub  
Set **Root Directory** to `react-UI/train-ticket-booking-ui`

### 2. Set environment variable

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | your Railway backend URL, e.g. `https://tracknova.up.railway.app` |

### 3. Build settings (Vercel auto-detects CRA)
- Build command: `npm run build`
- Output directory: `build`

### 4. Deploy
Vercel deploys on every push to main. The `vercel.json` rewrites handle client-side routing.

---

## Local development (no changes needed)

```bash
# Backend — uses H2 file DB automatically
cd app && ../gradlew bootRun

# Frontend — points to localhost:8080
cd react-UI/train-ticket-booking-ui && npm start
```

To run tests locally:
```bash
./gradlew :app:test
```
The test profile uses in-memory H2 (`application-test.properties`) — no PostgreSQL needed.

---

## Checklist

- [ ] Railway PostgreSQL added and JDBC URL copied
- [ ] All 7 backend env vars set in Railway
- [ ] `REACT_APP_API_URL` set in Vercel pointing to Railway URL
- [ ] CORS: verify Railway URL is allowed (Spring Security currently permits all origins — tighten in prod if needed)
- [ ] JWT_SECRET is a strong random value (not the default dev key)
