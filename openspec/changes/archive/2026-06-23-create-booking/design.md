## Context

Authentication, availability listing, and the Google Calendar adapter are already in place. The domain already exposes `DailyAvailability.canBook(slot)` (true when the slot overlaps no internal booking or external event) and `TimeSlot` (enforces end-after-start, ≥15 min, ≤24 h). The `Booking` Prisma model exists, but `IBookingRepository` is read-only (`findByUserAndDate`) and `BookingsModule` only wires that repository — there is no controller, service, or write path.

Three ADRs constrain this change:
- **ADR-001**: a connected Google Calendar is a *strict prerequisite* for creating a booking (authentication alone is not enough).
- **ADR-002**: the unconnected-user rejection must be a clean, distinguishable signal the frontend can turn into an upsell — i.e. a specific status/message, not a generic error.
- **ADR-003**: conflict validation checks only the user's **primary** calendar (already how `GoogleCalendarService` behaves).

## Goals / Non-Goals

**Goals:**
- Add `POST /bookings` that persists a booking only when all booking-confirmation rules pass.
- Re-check the live calendar at confirmation time (not trust the earlier availability read), per the core domain rule.
- Reuse existing domain (`TimeSlot`, `DailyAvailability.canBook`) and repository-via-interface conventions.

**Non-Goals:**
- Listing bookings (`GET /bookings`) and deleting bookings (`DELETE /bookings`) — explicitly out of scope.
- Multi-calendar conflict checking (ADR-003 fixes this to `primary`).
- Recurring bookings, timezones beyond UTC, or double-booking across different users (bookings are per-user).

## Decisions

### Decision 1: Gate on `calendarConnected` explicitly, before the conflict check
`GoogleCalendarService.getEventsForDate` returns `[]` when the user is unconnected. If the booking flow relied only on the conflict check, an unconnected user would *always* pass (no external events) — directly violating ADR-001. So `BookingsService` SHALL check `user.calendarConnected` (and presence of tokens) first and throw `ForbiddenException` (`403`) with a clear, frontend-actionable message before fetching events or calling `canBook`.
- *Alternative considered*: make `getEventsForDate` throw when unconnected. Rejected — it would break availability listing, which intentionally degrades gracefully (ADR-002 read-only state).

### Decision 2: Reuse `DailyAvailability.canBook` for conflict detection
The service fetches the day's internal bookings (`findByUserAndDate`) and external events (`getEventsForDate`) in parallel, constructs `DailyAvailability(internal, external)`, and calls `canBook(requestedSlot)`. False → `ConflictException` (`409`). This keeps the overlap logic in one tested place and satisfies "calendar checked at confirmation time."
- *Alternative considered*: a bespoke overlap query in SQL. Rejected — it can't see Google Calendar events and would duplicate domain logic.

### Decision 3: Validate the requested slot by constructing a `TimeSlot`
The DTO carries ISO `startTime` / `endTime` strings (validated by `class-validator` as ISO dates) plus a non-empty `title`. The service constructs a `TimeSlot` from them; the constructor's invariant violations (zero/negative duration, <15 min, >24 h) are caught and rethrown as `BadRequestException` (`400`). The day used for fetching bookings/events is derived from `startTime` (UTC calendar day), matching how availability is read.

### Decision 4: Add `create` to the repository, keep the controller envelope-free
`IBookingRepository` gains `create(input: { userId; title; startTime; endTime }): Promise<Booking>`; `PrismaBookingRepository` implements it via `prisma.booking.create`. The controller returns the created `Booking` as a plain value (HTTP `201`); the global response interceptor wraps it as `{ success: true, data }`. The service resolves the persisted user from the JWT principal via `IUserRepository.findByGoogleId` (mirrors `AvailabilityService`).

## Risks / Trade-offs

- **Calendar fetch failure could let a conflicting booking through** → `getEventsForDate` swallows API errors and returns `[]`, so a transient Google outage would make the conflict check pass against an empty external set. Accepted for the MVP since `calendarConnected` is still enforced; a fail-closed mode (reject when the live fetch errors) is noted as a future hardening and would require surfacing the error from the provider.
- **Same-day query window** → bookings/events are fetched for the `startTime`'s UTC day; a slot near midnight will not be compared against an adjacent-day event. Consistent with current availability behavior and bounded by `TimeSlot`'s 24 h cap; acceptable for MVP.
- **Race between two concurrent booking requests** → two overlapping requests could both pass `canBook` before either persists. Low likelihood for a single-user calendar at MVP scale; a DB-level exclusion constraint is a future option.
