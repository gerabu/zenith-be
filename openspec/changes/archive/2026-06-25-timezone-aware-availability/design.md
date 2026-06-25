## Context

`GET /availability/:date` resolves a day window in UTC. `AvailabilityService.getTimeline` computes `dayStart`/`dayEnd` with `Date.UTC(...)`, and `DailyAvailability.getTimeline` clips every busy slot to that UTC window. Independently, `GoogleCalendarService.getEventsForDate` re-derives its own Google query window from the bare `date` using `setHours(0,0,0,0)` / `setHours(23,59,...)` — which operate in **server-local** time before `toISOString()` converts back to UTC, sliding the window by the server's offset.

Because the timeline clips to the UTC day, the `setHours` bug mainly drops events near midnight; the visible "events on the wrong day" symptom comes from the deeper fact that the whole pipeline defines a day in UTC while the viewer thinks in local time. The frontend is moving to render in the viewer's browser timezone (separate `zenith-fe` change), so the backend must define the day in that same timezone. Only the frontend knows the browser timezone, so it must travel to the backend as a request parameter.

## Goals / Non-Goals

**Goals:**
- Define the day window for a request in a caller-supplied IANA timezone, defaulting to UTC.
- Compute the window once and thread it through bookings, calendar fetch, and the timeline so no layer re-derives it.
- Remove the `setHours`-based window derivation in `GoogleCalendarService`.
- Be DST-correct without adding a dependency.

**Non-Goals:**
- No frontend changes (tracked in `zenith-fe`).
- No change to the response envelope or to slot representation (slots stay UTC ISO instants).
- Not adopting the calendar's own IANA timezone from Google — the chosen semantic is the **viewer's** timezone.
- No timezone library (Luxon/date-fns-tz); the built-in `Intl` API suffices.

## Decisions

**1. Pass the timezone as a `tz` query parameter (IANA name), default UTC.**
The viewer timezone is only known in the browser, so it must be sent. An IANA name (e.g. `America/New_York`) is preferred over a numeric offset because the backend can resolve the correct offset for the *specific target date*, handling DST transitions that a fixed offset cannot. Invalid or missing `tz` falls back to UTC, keeping the endpoint backward-compatible and never 500-ing on a bad timezone.

_Alternative considered:_ numeric `tzOffset` minutes — rejected; the client would have to pick the offset for the right date, and it breaks across DST boundaries within a queried day.

**2. Compute local-midnight-as-UTC with `Intl.DateTimeFormat`.**
A utility resolves the UTC instant of `00:00` on `date` in `tz` by formatting a reference instant in that timezone, deriving the offset, and adjusting. This is the standard dependency-free technique and is DST-aware because the offset is computed for the actual date. `dayEnd` is the same computation for `date + 1 day` (computed via the calendar date, not `+24h`, so DST-shortened/lengthened days remain correct).

_Alternative considered:_ `Temporal` — not yet stable in the project's Node runtime.

**3. Compute the window once in `AvailabilityService` and thread it everywhere.**
The window becomes the single source of truth, passed to `bookingRepository.findByUserAndDate`, `calendarProvider.getEventsForDate`, and `DailyAvailability.getTimeline`. This removes the duplicated/divergent derivation that caused the original bug.

**4. Change `ICalendarProvider.getEventsForDate` to receive the window.**
The provider should be handed `{ timeMin, timeMax }` (or `start`/`end` Dates) instead of a bare `date`, so it never reinterprets "the day." This is an internal interface; consumers depend on the abstraction per existing conventions.

## Risks / Trade-offs

- **Cross-repo contract drift** (FE sends `tz`, BE expects it) → BE defaults to UTC when `tz` is absent/invalid, so an un-migrated FE keeps working exactly as today; no hard coupling on deploy order.
- **`Intl` timezone math is easy to get subtly wrong** → encapsulate in one tested utility with cases for UTC, a positive offset, a negative offset, and a DST-transition date; do not inline the math in services.
- **`findByUserAndDate` currently takes a `date`** → its signature/semantics change to a window; verify the repository implementation filters on `[start, end)` and update its tests.
- **Invalid IANA names** (e.g. typo) → `Intl.DateTimeFormat` throws a `RangeError`; the utility catches and falls back to UTC rather than surfacing a 500.
