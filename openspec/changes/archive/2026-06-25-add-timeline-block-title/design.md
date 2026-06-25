## Context

The availability timeline is produced by a small pipeline: `AvailabilityService.getTimeline` gathers internal bookings and external calendar events, wraps each in the `TimeSlot` value object, builds a `DailyAvailability` domain object, and calls `getTimeline(window.start, window.end)` to split the day into `available` / `booked` / `external` blocks.

The title is dropped at three points:
- `GoogleCalendarService.mapEventsToTimeSlots` keeps only `start`/`end`, discarding `event.summary`.
- `AvailabilityService.getTimeline` maps each booking to `{ start, end }`, discarding `Booking.title`.
- The domain types — `TimeSlot` (start/end only) and `TimelineBlock` (`{ slot, status }`) — have nowhere to carry a title.

`DailyAvailability` and `ICalendarProvider.getEventsForDate` have a second consumer: `BookingsService.confirmBooking`, which only needs overlap detection (`canBook`) and does not care about titles. Any signature change must stay cheap for that path.

## Goals / Non-Goals

**Goals:**
- Surface a `title` on busy (`booked` / `external`) timeline blocks in the `GET /availability/:date` response.
- Thread the title from its real sources: `Booking.title` and Google event `summary`.
- Keep the change additive and non-breaking for the API and for the booking-conflict path.

**Non-Goals:**
- No titles on `available` blocks (they represent absence of an event).
- No schema changes — `Booking.title` already exists.
- No redesign of the timeline-splitting algorithm or the response envelope.
- No new fields beyond `title` (e.g. location, attendees).

## Decisions

### Keep `TimeSlot` a pure time-interval value object; carry the title on the busy-slot wrapper

`TimeSlot` encodes interval invariants (min 15 min, max 24 h, non-zero, ordered) and is reused for booking-conflict checks where a title is meaningless. Rather than pollute it, the title rides alongside the slot.

- Introduce a small `BusySlot` shape: `{ slot: TimeSlot; title: string }`.
- `DailyAvailability`'s constructor accepts `BusySlot[]` for both internal and external inputs (instead of `TimeSlot[]`). It already builds an internal `busySlots: TimelineBlock[]`; it now copies the title onto each.
- `TimelineBlock` becomes `{ slot: TimeSlot; status: SlotStatus; title?: string }`. `available` blocks created during splitting leave `title` undefined; busy segments inherit the source `BusySlot.title`.

_Alternative considered:_ add `title` to `TimeSlot`. Rejected — it muddies a reused invariant-bearing VO and would force a title onto conflict-check slots that have none.

### `ICalendarProvider.getEventsForDate` returns events with titles

Change the return type from `TimeSlot[]` to `CalendarEvent[]` = `{ slot: TimeSlot; title: string }`. `GoogleCalendarService` maps `event.summary ?? ''` into `title`. This is the only place the external title is available, so the interface must expose it.

### Default missing titles to empty string, not undefined, on busy blocks

A busy block always has a `title` key (possibly `""`) so the frontend can rely on its presence whenever `status !== 'available'`. Bookings carry a required `title` already; Google events may lack a `summary`, hence the `""` fallback.

### `BookingsService` adapts with a trivial wrapper

`confirmBooking` only calls `canBook`, which ignores titles. It wraps its internal and external slots as `BusySlot` with whatever title is at hand (booking titles for internal, event titles for external) — titles it never reads. This keeps a single `DailyAvailability` constructor signature rather than an overload.

### Controller response shape

The controller continues to return the domain `TimelineBlock[]`; the global response interceptor wraps it in the envelope and serializes `slot` to `{ start, end }`. `title` is a plain optional string, so it serializes directly with no DTO mapping required. (If a dedicated response DTO is later desired for the timeline, it is a separate, orthogonal change.)

## Risks / Trade-offs

- **Constructor signature change ripples to `BookingsService` and specs** → contained: two call sites (`availability.service.ts`, `bookings.service.ts`) plus `daily-availability.spec.ts` and `google-calendar.service.spec.ts`. All updated in the same change.
- **Frontend may assume `title` is always present** → mitigated by the spec: `title` appears only on busy blocks and is `""` when the source has none, so `status` reliably predicts the field's presence.
- **Leaking private calendar event titles** → acceptable: the timeline already reveals that the slot is `external` (busy); the summary is the user's own primary-calendar event, returned only to that authenticated user.
