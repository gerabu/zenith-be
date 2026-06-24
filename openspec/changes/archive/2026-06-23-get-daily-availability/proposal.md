## Why

The app's core purpose is to let users check their availability for a given day before confirming a booking. Without a `/availability` endpoint, clients cannot display which time slots are free versus occupied by either internal bookings or Google Calendar events. The foundation (Google Calendar adapter, domain models `TimeSlot` and `DailyAvailability`) is already in place; this change wires them together behind a consistent HTTP API.

## What Changes

- **New**: `GET /availability?date=YYYY-MM-DD` endpoint returns the full timeline for the authenticated user's day, combining internal bookings and Google Calendar events.
- **New**: `Booking` Prisma model and database migration, so internal bookings can be persisted and queried.
- **New**: `IBookingRepository` interface + Prisma implementation, giving the availability service access to bookings without coupling to Prisma directly.
- **New**: Uniform API response envelope `{ success: boolean; data?: T; error?: string }` enforced globally via a response interceptor and exception filter.
- **Modified**: `GET /auth/sync` response wrapped in the new envelope (no behavior change, only response shape change).

## Capabilities

### New Capabilities

- `daily-availability`: Endpoint that merges internal bookings and Google Calendar events into a `DailyAvailability` timeline and exposes it as `GET /availability?date=YYYY-MM-DD`.
- `api-response-envelope`: Global response shape contract — every success response is `{ success: true, data: T }` and every error is `{ success: false, error: string }`, enforced via NestJS interceptor and exception filter.
- `booking-persistence`: Prisma `Booking` model, schema migration, and `IBookingRepository` / `PrismaBookingRepository` to make internal bookings readable by the availability layer.

### Modified Capabilities

- `user-auth`: `GET /auth/sync` response shape changes to conform to the new envelope (`{ success: true, data: <user> }`). The authentication logic and sync semantics are unchanged.

## Impact

- **New files**: `prisma/schema.prisma` (Booking model), `src/availability/` module files (controller, service, module), `src/bookings/` repository interface + Prisma impl, `src/common/` interceptor and exception filter.
- **Modified files**: `src/auth/auth.controller.ts` (return plain value; envelope applied globally), `src/main.ts` (register interceptor, filter, and `ValidationPipe`).
- **Dependencies**: No new npm packages needed; Prisma CLI already in dev deps.
- **Database**: First real schema migration; requires running `prisma migrate dev`.
