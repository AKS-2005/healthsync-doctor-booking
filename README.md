# 🏥 HealthSync — High-Concurrency Doctor Appointment Booking System

A production-grade, full-stack medical appointment scheduling web application designed to demonstrate the dual-database architecture: **Redis** for fast, ephemeral slot locking, real-time availability checks, rate limiting, and caching alongside **PostgreSQL** for ACID-compliant permanent storage, audit logging, and relational integrity.

---

## 🌟 Key Highlights

* **5-Minute Atomic Slot Lock**: Leverages Redis `SET key token NX EX 300` to prevent two patients from reserving the same appointment slot simultaneously.
* **Dual-Level Race-Condition Protection**:
  * **Level 1 (Memory/Redis)**: Fast sub-millisecond rejection of concurrent slot lock attempts before reaching SQL.
  * **Level 2 (Relational/PostgreSQL)**: Partial unique constraint `UNIQUE (doctor_id, appointment_date, appointment_time) WHERE status != 'CANCELLED'` and transactional row locking (`FOR UPDATE`) inside `BEGIN ... COMMIT` blocks.
* **Atomic Lua Lock Release**: Custom Redis Lua script guarantees that only the user holding the unique UUID lock token can release or modify their active reservation.
* **Dynamic Frontend Reservation Timer**: Visual 5-minute countdown clock with expiration warning and real-time slot state indicators (*Available*, *Temporarily Locked*, *Booked*).
* **AI Clinical & Booking Assistant (RAG Agent)**: Context-aware floating AI widget with Gemini API integration and smart grounded retrieval. Authenticated patients get direct access to their upcoming appointments, doctor recommendations by symptoms, and cancellation assistance, while guest users receive triage guidance and doctor discovery.
* **Interactive Concurrency Simulator**: Built-in visual simulation tool allowing testers to trigger simultaneous concurrent booking attempts side-by-side with millisecond timings.
* **Role-Based Portals**: Dedicated, responsive experiences for **Patients**, **Doctors**, and **Administrators** with instant demo account switchers.
* **Redis Caching & Sliding Rate Limiting**: In-memory caching with automatic cache invalidation and brute-force prevention on authentication and booking endpoints.

---

## 🏛️ System Architecture

```text
                    ┌─────────────────────────────────────────┐
                    │          React.js + Vite Frontend       │
                    │   (Patient, Doctor, Admin Dashboards)   │
                    └────────────────────┬────────────────────┘
                                         │ HTTPS / REST API
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │          Node.js + Express API          │
                    │     (JWT Auth, RBAC, Data Validation)   │
                    └───────────┬───────────────────┬─────────┘
                                │                   │
        Fast Transient State    ▼                   ▼    Permanent Relational Data
       ┌───────────────────────────────┐   ┌──────────────────────────────┐
       │             Redis             │   │          PostgreSQL          │
       │ • 5-Minute Slot Locks (SET NX)│   │ • Users & RBAC Roles         │
       │ • Atomic Lua Lock Release     │   │ • Doctors & Schedules        │
       │ • Fast Availability Check     │   │ • Specializations            │
       │ • Sliding Rate Limiting       │   │ • Appointments (UNIQUE Idx)  │
       │ • Doctor & Category Cache     │   │ • Notifications & History    │
       └───────────────────────────────┘   └──────────────────────────────┘
```

---

## 🔒 Deep Dive: 5-Minute Redis Appointment Slot Locking

### The Concurrency Problem in Medical Scheduling
When multiple patients attempt to book popular doctor slots (e.g. 10:30 AM), traditional database queries can cause intense row lock contention, deadlocks, and double-booking race conditions under high traffic spikes.

### The Two-Level Solution

```text
Patient A (10:30 AM) ───┐
                        ├──► [Redis SET appointment_lock:doctor_5:2026-08-27:10:30 <uuid> NX EX 300]
Patient B (10:30 AM) ───┘
                                   │
                                   ├──► Patient A: SUCCESS (200 OK) -> 5-Minute Reservation
                                   └──► Patient B: REJECTED (409 Conflict) -> "Slot is locked by another patient"
```

#### Step 1: Atomic Lock Acquisition
When Patient A selects an available slot:
```redis
SET appointment_lock:doctor_5:2026-08-27:10:30 e4d8c7b6-9f12-4c28-9d21-a1b2c3d4e5f6:user_42 NX EX 300
```
- `NX`: Ensures the key is written **only if it does not already exist**.
- `EX 300`: Automatically expires the lock after **300 seconds (5 minutes)**.

#### Step 2: Atomic Lua Lock Release
To ensure Patient B cannot delete Patient A's reservation, the backend evaluates an atomic Lua script:
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

#### Step 3: Transactional PostgreSQL Commit
When the patient confirms their booking:
1. Verify Redis lock token ownership and active TTL.
2. `BEGIN` PostgreSQL Transaction.
3. Lock row candidate in SQL: `SELECT ... FOR UPDATE`.
4. Insert permanent appointment record.
5. `COMMIT` Transaction.
6. Delete temporary Redis lock.

---

## 🗄️ Database Schema (PostgreSQL DDL)

| Table | Description | Key Constraints & Indexes |
| :--- | :--- | :--- |\n| **`users`** | Authentication & user profiles | `id (PK)`, `email (UNIQUE)`, `role (PATIENT, DOCTOR, ADMIN)` |
| **`specializations`** | Medical clinical departments | `id (PK)`, `name (UNIQUE)` |
| **`doctors`** | Doctor profiles & pricing | `id (PK)`, `user_id (FK users.id UNIQUE)`, `specialization_id (FK)` |
| **`doctor_schedules`** | Weekly working hours & slot duration | `id (PK)`, `doctor_id (FK)`, `UNIQUE(doctor_id, day_of_week)` |
| **`doctor_blocked_dates`** | Unavailable vacation dates | `id (PK)`, `doctor_id (FK)`, `UNIQUE(doctor_id, blocked_date)` |
| **`appointments`** | Permanent consultation records | `id (PK)`, `patient_id (FK)`, `doctor_id (FK)`, `status`<br>⚡ **`UNIQUE INDEX (doctor_id, appointment_date, appointment_time) WHERE status != 'CANCELLED'`** |
| **`notifications`** | In-app alerts | `id (PK)`, `user_id (FK)`, `appointment_id (FK)` |

---

## 🔑 Demo User Credentials

The database seed script initializes realistic test accounts ready for instant testing:

| Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@healthsync.com` | `admin123` | Full system oversight & doctor verification |
| **Doctor** | `dr.sharma@healthsync.com` | `doctor123` | Senior Cardiologist (MD, FACC) |
| **Doctor** | `dr.patel@healthsync.com` | `doctor123` | Neurologist (Johns Hopkins) |
| **Doctor** | `dr.reddy@healthsync.com` | `doctor123` | Dermatologist (Stanford) |
| **Patient** | `patient1@healthsync.com` | `patient123` | John Doe |
| **Patient** | `patient2@healthsync.com` | `patient123` | Jane Smith |
| *(Patients 1 to 20)* | `patient[1-20]@healthsync.com` | `patient123` | Pre-populated patients |

> 💡 *Note: The navigation bar includes a **"Demo Switcher"** button that lets you instantly switch between Patient, Doctor, and Admin personas in one click!*

---

## 🚀 Quick Start with Docker Compose

Run the complete multi-container stack (**PostgreSQL + Redis + Express Backend + React Vite Frontend**) with a single command:

```bash
# Clone and enter directory
cd Hackathon-2

# Launch all 4 services
docker compose up --build
```

### Access URLs:
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:5000](http://localhost:5000)
* **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 💻 Manual Local Development Setup

### 1. Prerequisites
* Node.js `>= 18.0.0`
* PostgreSQL `>= 14`
* Redis Server `>= 6.2`

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run database migrations and seed realistic demo data
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing Suite

The backend contains a test runner validating all 6 core concurrency and reliability criteria:

```bash
cd backend
npm test
```

### Tests Covered:
1. **Concurrent Slot Locking**: 2 simultaneous requests fired in parallel against `SET NX`; verifies exactly 1 user acquires the lock and the 2nd receives a 409 Conflict.
2. **TTL Expiration**: Verifies a locked slot automatically reverts to `AVAILABLE` upon TTL timer expiry.
3. **Lock Ownership & Security**: Asserts unauthorized users cannot release or tamper with another patient's reservation.
4. **Expired Lock Rejection**: Rejects appointment confirmation when the lock token has expired.
5. **Atomic Lua Script Verification**: Validates the atomic GET + DEL Lua script.
6. **Sliding Rate Limiting**: Validates that exceeding 5 rapid login attempts triggers a `429 Too Many Requests`.

---

## 📡 REST API Reference Summary

### Authentication
* `POST /api/auth/register` — Register a new patient or practitioner
* `POST /api/auth/login` — Authenticate and receive JWT token (Rate limited: 5/min)
* `GET /api/auth/me` — Get current authenticated user profile

### Doctors & Availability
* `GET /api/doctors` — Search doctors with filters & Redis caching (`?specialization=cardiology&search=sharma`)
* `GET /api/doctors/:id` — Get doctor profile and working hours (Redis cached)
* `GET /api/doctors/:doctorId/availability?date=YYYY-MM-DD` — Fast slot status calculation (`AVAILABLE`, `LOCKED`, `BOOKED`)
* `POST /api/doctors/:id/schedules` — Configure weekly working schedule
* `POST /api/doctors/:id/blocked-dates` — Block vacation/unavailable dates

### Slot Locking & Appointments
* `POST /api/appointments/lock` — Atomically acquire 5-minute Redis slot lock
* `DELETE /api/appointments/lock` — Atomically release active slot lock via Lua script
* `POST /api/appointments` — Confirm reservation & commit to PostgreSQL transaction
* `GET /api/appointments/my` — Get user's appointments history
* `PATCH /api/appointments/:id/cancel` — Cancel confirmed appointment
* `PATCH /api/appointments/:id/status` — Doctor marks visit `COMPLETED` or `NO_SHOW`

### Concurrency Simulator
* `POST /api/demo/simulate-race-condition` — Interactive millisecond dual-lock demonstration

---

## 🛡️ License
MIT License. Built for the Hackathon Demonstration.
