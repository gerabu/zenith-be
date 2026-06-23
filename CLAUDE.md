# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`zenith-be` is the NestJS backend for a Google Calendar booking app. Users log in with Google, book named time slots, and the system rejects bookings that conflict with **either** an existing booking in the database **or** an event in the user's Google Calendar.

The repo is currently a **stock NestJS scaffold** (`src/app.*`). Almost none of the real application exists yet. The feature work, module layout, and conventions are specified in **`ARCHITECTURE.md`** — read it before writing any code. It is the source of truth; this file summarizes what is load-bearing and where the scaffold disagrees with it.

## Critical discrepancies to resolve before building

The committed scaffold doesn't yet implement most of `ARCHITECTURE.md`. When you start real feature work, build these out:

- **No database yet.** ARCHITECTURE.md requires PostgreSQL via Docker Compose (`docker-compose.yml` at root) and Prisma (`prisma/schema.prisma`). Neither exists; both need to be created.
- **No global pipes/interceptors/filters.** `main.ts` is bare. The API contract below is not yet enforced.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

```bash
pnpm install
pnpm start:dev          # watch mode (NestJS), serves on PORT or 3000
pnpm build              # nest build -> dist/
pnpm lint               # eslint --fix over src/test
pnpm format             # prettier --write

# Tests — Jest
pnpm test               # all unit specs (*.spec.ts)
pnpm test -- app.controller   # run a single spec by name/path filter
pnpm test:cov           # coverage
pnpm test:e2e           # e2e (test/jest-e2e.json)
```

## Architecture (from ARCHITECTURE.md)

**Vertical slices** under `src/`, no circular dependencies:
- `common/` — global infra: `@CurrentUser()` decorator, global exception filter, global response interceptor, shared interfaces.
- `prisma/` — `PrismaModule` + `PrismaService`.
- `auth/` — Google login; `GET /auth/sync` upserts the user. JWT strategy + `JwtAuthGuard`.
- `google-calendar/` — adapter (`GoogleCalendarService` behind `ICalendarProvider`) that fetches the user's calendar events.
- `availability/` — core domain with rich models (`TimeSlot`, `DailyAvailability`); `GET /availability`.
- `bookings/` — `POST /bookings`, `GET /bookings`, `DELETE /bookings`.

**Non-negotiable conventions:**

1. **Uniform response envelope.** Every HTTP response is `{ success: boolean; data?: T; error?: string }` with mutual exclusivity (success ⇒ `data` only; failure ⇒ `error` only). Enforced globally via a response interceptor (success) and exception filter (errors) — controllers/services return plain values, not the envelope.
2. **Repository pattern via interfaces.** Controllers never touch Prisma. Services depend on interfaces (`IUserRepository`, `IBookingRepository`, `ICalendarProvider`); NestJS modules bind the Prisma implementation through custom providers. Keep repositories lean — no generic base-repository abstractions.
3. **DTO validation.** Use `class-validator` + `class-transformer`; a global `ValidationPipe` in `main.ts` rejects invalid payloads.

**Core domain rule (the reason this app exists):** a booking must be rejected if it overlaps an existing DB booking **or** an event in the user's Google Calendar. The calendar must be checked at booking-confirmation time, not only when listing availability.

## Spec-driven workflow (OpenSpec)

This repo uses OpenSpec (`openspec/`, `schema: spec-driven`). Non-trivial features are expected to go through a change proposal before implementation — use the `openspec-propose` / `openspec-apply-change` skills. `openspec/changes/archive/` holds completed changes; `openspec/specs/` holds current specs. Consider adding stack/conventions to `openspec/config.yaml`'s `context` block so generated artifacts respect the rules above.
