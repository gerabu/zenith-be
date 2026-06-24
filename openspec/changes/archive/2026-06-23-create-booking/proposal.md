## Why

Users can authenticate and inspect their daily availability, but there is no way to actually reserve a slot — the app's core action is missing. We need a `POST /bookings` endpoint that persists a booking only when it violates no business rule: it must not overlap an existing internal booking **or** a Google Calendar event, and (per ADR-001) the user's calendar must be connected before any booking can be created.

## What Changes

- **New**: `POST /bookings` endpoint (JWT-protected) that creates a booking for the authenticated user from a `{ title, startTime, endTime }` payload.
- **New**: Booking-confirmation business rules enforced server-side:
  - **Calendar-connection gate (ADR-001)**: reject with `403` when the user has not connected their Google Calendar — a connected calendar is a strict prerequisite for booking.
  - **Conflict check**: build a `DailyAvailability` from the day's internal bookings + primary-calendar events (ADR-003) and reject with `409` when `canBook()` returns false.
  - **Slot validity**: reject with `400` when the requested slot violates `TimeSlot` invariants (end after start, min 15 min, max 24 h).
- **Modified**: `IBookingRepository` / `PrismaBookingRepository` gain a `create(...)` method so bookings can be persisted (today the repository is read-only).
- **Modified**: `BookingsModule` exposes a `BookingsController` + `BookingsService` (today the module only wires the repository).

## Capabilities

### New Capabilities
- `booking-creation`: `POST /bookings` endpoint and the booking-confirmation domain flow — calendar-connection gating, internal + external conflict detection via `DailyAvailability.canBook()`, slot validation, and persistence of the resulting booking.

### Modified Capabilities
- `booking-persistence`: `IBookingRepository` adds a `create(input)` method (and its `PrismaBookingRepository` implementation) to persist new bookings; previously the interface only supported reads.

## Impact

- **New files**: `src/bookings/bookings.controller.ts`, `src/bookings/bookings.service.ts`, `src/bookings/dto/create-booking.dto.ts` (+ specs).
- **Modified files**: `src/bookings/interfaces/booking-repository.interface.ts` (add `create`), `src/bookings/repositories/prisma-booking.repository.ts` (implement `create`), `src/bookings/bookings.module.ts` (declare controller, provide service, import `GoogleCalendarModule` + `auth`/`PrismaModule` deps), `src/app.module.ts` (ensure `BookingsModule` registered).
- **APIs**: adds `POST /bookings`; responses use the existing global envelope (`{ success, data | error }`).
- **Dependencies / DB**: no new npm packages, no schema migration — the existing `Booking` model already covers `title`, `startTime`, `endTime`, `userId`.
- **Out of scope**: listing bookings (`GET /bookings`) and deleting bookings (`DELETE /bookings`).
