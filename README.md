# Zenith — Backend

A **NestJS + TypeScript** booking API for a Google Calendar scheduling app. Users authenticate with Google, book named time slots, and the system guarantees a booking never collides with **either** an existing booking in the database **or** a real event on the user's Google Calendar.

> This repository is also a demonstration of how I build software: **AI-assisted, Spec-Driven Development** using the [OpenSpec](https://github.com/Fission-AI/OpenSpec) core flow, with every load-bearing decision captured in **Architecture Decision Records (ADRs)** before a line of code is written.

---

## Why this repo is worth a look

If you're evaluating engineering ability, these are the things I'd point you to first:

- **Spec-Driven Development with AI as a force multiplier.** Every non-trivial feature went through an OpenSpec proposal → design → tasks → implementation → archive cycle. The intent, trade-offs, and acceptance criteria exist *before* the code, so the AI accelerates implementation without owning the architecture. The full history lives in [`openspec/changes/archive/`](openspec/changes/archive/).
- **Documented decision-making.** The interesting product/engineering judgment calls are written down as [ADRs](docs/adr/) — not just *what* was built, but *why*, *what was rejected*, and *what the trade-off costs*.
- **Pragmatic Clean Architecture.** Vertical slices, the Repository Pattern behind interfaces, a strict uniform response envelope, and a stateless OAuth resource-server model — applied deliberately, not dogmatically.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | NestJS (Express) |
| Language | TypeScript |
| Database | PostgreSQL (via Docker Compose) |
| ORM | Prisma |
| Auth | Google OAuth 2.0 — backend validates Google **ID tokens** as JWTs (`passport-jwt` + JWKS) |
| Validation | `class-validator` / `class-transformer` behind a global `ValidationPipe` |
| API docs | Swagger / OpenAPI (Basic-Auth protected) |
| Testing | Jest (unit + e2e) |
| Tooling | pnpm, ESLint, Prettier |

---

## AI-Assisted, Spec-Driven Development with OpenSpec

This project deliberately treats **the specification as the source of truth and the AI as the implementer**, rather than letting an AI improvise an architecture. The workflow uses the OpenSpec core flow:

```
explore → propose → (design + spec + tasks) → apply → archive
```

1. **Propose** — each feature starts as a change proposal describing the *what* and *why*.
2. **Design** — a `design.md` records the technical decisions, alternatives considered, risks, and a migration plan.
3. **Spec** — capability specs define the behavioral contract.
4. **Tasks** — implementation is broken into reviewable, scoped units.
5. **Apply & Archive** — once shipped, the change is archived as a permanent, auditable record.

The archived changes read as a changelog of *reasoning*, not just commits:

| Change | What it added |
| --- | --- |
| `add-google-auth` | Stateless Google ID-token validation, `IUserRepository`, `/auth/sync` |
| `add-google-calendar-events` | `ICalendarProvider` adapter over the Google Calendar API |
| `get-daily-availability` | Rich `TimeSlot` / `DailyAvailability` domain models |
| `create-booking` | Conflict-checked booking command (DB **and** calendar) |
| `add-calendar-connection-endpoint` | "Optional but blocking" calendar connection |
| `add-calendar-connection-status-endpoint` | FE state-driving connection status |
| `add-delete-booking` | Owner-scoped booking deletion |
| `timezone-aware-availability` | Timezone-correct slot generation |
| `add-timeline-block-title` | Named time blocks on availability |
| `add-swagger-api-docs` | Password-protected OpenAPI documentation |

The conventions that bind all of this together (response envelope, repository pattern, vertical slices, validation) are codified in [`ARCHITECTURE.md`](ARCHITECTURE.md) and fed to the AI as guardrails via [`CLAUDE.md`](CLAUDE.md).

---

## Architecture Decision Records

The judgment calls that shaped the product live in [`docs/adr/`](docs/adr/). A few highlights:

- **[ADR-001 — Google Calendar Connection as "Optional but Blocking"](docs/adr/adr-001.md)**
  Authentication (Google login) is decoupled from authorization/integration (Calendar API access). Login requires only basic profile scopes; granting Calendar access is *not* forced at signup, but it **is** a hard prerequisite for creating a booking. This follows the principle of least privilege and reduces onboarding drop-off, while honoring the core domain rule that bookings must be validated against the calendar.

- **[ADR-002 — Soft Onboarding & Proactive UI Flow](docs/adr/adr-002.md)**
  Because a user can exist in a "logged in but not connected" state, the backend signals that state explicitly (`GET /auth/calendar-connection`) so the frontend can disable slots and offer a connect CTA — turning a backend `403` into guidance rather than an "error-by-design" experience.

- **[ADR-003 — Primary Calendar Only](docs/adr/adr-003.md)**
  Conflict validation checks only the user's **primary** Google Calendar via the `'primary'` alias — a single low-latency API call instead of multi-calendar aggregation. A scoped, conscious MVP trade-off with the future iteration path noted.

---

## Authentication & Authorization flow

The backend is a **stateless resource server**. It never participates in the OAuth redirect dance — that is owned by the Next.js frontend. The backend's job is to *verify* credentials it receives and enforce domain authorization.

### Authentication (who you are)

```
┌──────────┐   1. Google OAuth login (redirect dance)   ┌────────────┐
│ Frontend │ ─────────────────────────────────────────▶ │   Google   │
│ (Next.js)│ ◀───────────── ID token (JWT) ───────────── │            │
└────┬─────┘                                             └────────────┘
     │
     │ 2. Every request: Authorization: Bearer <Google ID token>
     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                                   │
│   JwtAuthGuard → passport-jwt strategy                             │
│   • Fetches Google's public keys via JWKS (cached, rotation-safe) │
│   • Verifies RS256 signature, issuer, audience (GOOGLE_CLIENT_ID), │
│     and expiry — fully offline, no per-request call to Google      │
│   • validate() returns a lightweight principal (googleId, email)  │
│   • @CurrentUser() exposes it to controllers                      │
└──────────────────────────────────────────────────────────────────┘
```

- The frontend sends Google's **ID token** (a signed JWT) as a bearer credential — *not* the opaque access token — so the backend can verify it cryptographically against Google's JWKS with **no network round-trip per request**. (See the [auth design notes](openspec/changes/archive/2026-06-23-add-google-auth/design.md).)
- **`GET /auth/sync`** — called once by the frontend right after login. Idempotently upserts the `User` row from the verified token claims. Per-request auth stays read-only and fast; user creation is an explicit step keyed on the stable Google `sub` claim.

### Authorization (what you're allowed to do)

Authorization is enforced as an explicit domain rule, per ADR-001:

```
PATCH /auth/calendar-connection   → user grants Calendar access (tokens stored)
GET   /auth/calendar-connection   → FE reads connection state to drive the UI
POST  /bookings                   → requires calendarConnected === true
                                    ↳ 403 if not connected (FE turns this into a CTA)
                                    ↳ 409 if the slot overlaps a DB booking OR a calendar event
```

The **core domain guarantee**: a booking is rejected if it overlaps an existing database booking **or** an event on the user's primary Google Calendar — and the calendar is checked at *booking-confirmation time*, not only when listing availability.

---

## API surface

All responses follow a strict, mutually-exclusive envelope, enforced globally (response interceptor for success, exception filter for errors):

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;    // present only when success === true
  error?: string; // present only when success === false
}
```

| Method & path | Purpose |
| --- | --- |
| `GET /auth/sync` | Idempotent user upsert from token claims |
| `GET /auth/calendar-connection` | Report calendar connection status |
| `PATCH /auth/calendar-connection` | Store Google Calendar OAuth tokens |
| `GET /availability/:date` | Daily availability (timezone-aware) |
| `POST /bookings` | Create a conflict-checked booking |
| `DELETE /bookings/:id` | Delete an owned booking |
| `GET /docs` | Swagger UI (Basic-Auth protected) |

---

## Getting started

Package manager is **pnpm**.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env   # then fill in GOOGLE_CLIENT_ID, Swagger creds, etc.

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply the database schema
pnpm prisma migrate dev

# 5. Run the API (watch mode, http://localhost:3000)
pnpm start:dev
```

Interactive API docs are served at **`/docs`** (gated by `SWAGGER_USER` / `SWAGGER_PASSWORD`).

### Tests

```bash
pnpm test          # unit specs
pnpm test:e2e      # end-to-end
pnpm test:cov      # coverage
```

### Quality

```bash
pnpm lint          # eslint --fix
pnpm format        # prettier --write
```

---

## Repository map

```
src/
 ├── common/            # Global infra: response interceptor, exception filter,
 │                      #   @CurrentUser(), Swagger envelope decorators
 ├── prisma/            # PrismaModule + PrismaService
 ├── auth/              # Google JWT strategy, JwtAuthGuard, IUserRepository, /auth/*
 ├── google-calendar/   # ICalendarProvider adapter over the Google Calendar API
 ├── availability/      # Core domain: TimeSlot / DailyAvailability, GET /availability
 └── bookings/          # Conflict-checked commands: POST / DELETE /bookings

docs/adr/               # Architecture Decision Records
openspec/               # Spec-driven change proposals, specs, and archive
ARCHITECTURE.md         # Source-of-truth conventions
CLAUDE.md               # AI guardrails derived from ARCHITECTURE.md
```
