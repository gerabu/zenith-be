## Why

`GET /availability/:date` returns busy timeline blocks (`booked` / `external`) with only a time range and status, so the frontend cannot label what each block is. The titles already exist — `Booking.title` in the database and `summary` on each Google Calendar event — but both are discarded before reaching the response.

## What Changes

- Carry a human-readable `title` from each busy source through to the timeline:
  - Internal bookings: use `Booking.title`.
  - Google Calendar events: use the event `summary`.
- Add an optional `title` field to busy timeline blocks in the `GET /availability/:date` response. `available` blocks have no title.
- Stop discarding the title at the three layers that currently drop it: `GoogleCalendarService.mapEventsToTimeSlots`, `AvailabilityService.getTimeline` (booking → `{ start, end }` mapping), and the `DailyAvailability` / `TimelineBlock` domain model.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `daily-availability`: the availability timeline response gains a `title` on busy (`booked` / `external`) blocks so the frontend can display what each block represents.

## Impact

- **API**: `GET /availability/:date` response — each busy timeline entry gains an optional `title`. Additive, non-breaking.
- **Code**:
  - `src/google-calendar/interfaces/calendar-provider.interface.ts` and `google-calendar.service.ts` — surface event `summary` alongside each slot.
  - `src/availability/domain/daily-availability.ts` — `TimelineBlock` gains `title`; busy-slot inputs carry a title.
  - `src/availability/availability.service.ts` — thread `Booking.title` and calendar titles into the domain model.
  - Affected unit specs: `availability.service.spec.ts`, `daily-availability.spec.ts`, `google-calendar.service.spec.ts`.
- **No schema or dependency changes** — `Booking.title` already exists.
