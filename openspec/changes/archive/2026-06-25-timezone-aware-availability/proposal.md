## Why

Availability is computed entirely in UTC: the day window spans midnight-to-midnight UTC and `getEventsForDate` re-derives its Google query window with server-local `setHours`. For any viewer not in UTC this misplaces events — a calendar event at June 25, 21:00 in a UTC−5 viewer's timezone is a June 26 02:00 UTC instant, so it is returned under the wrong day and clipped at the wrong boundary. The frontend (a separate change) will render in the viewer's browser timezone; the backend must define "the day" in that same timezone for the two to agree.

## What Changes

- **BREAKING** `GET /availability/:date` accepts an optional `tz` query parameter (IANA name, e.g. `America/New_York`). The day window is computed as `[midnight date in tz, midnight next day in tz)`, expressed internally as UTC instants. When `tz` is omitted or invalid, the endpoint falls back to UTC (preserving today's behavior).
- The day window is computed **once** in `AvailabilityService` and threaded into the bookings query, the calendar fetch, and the timeline boundaries — no layer re-derives it.
- `GoogleCalendarService.getEventsForDate` stops using `setHours`/`toISOString` to build its query window and instead receives the already-computed `[start, end)` window, eliminating the server-local timezone shift bug.
- A small timezone utility computes the UTC instant of local midnight for a given IANA timezone and date, DST-aware via `Intl.DateTimeFormat` (no fixed offsets, no new dependency).
- Response shape is unchanged: `slot.start`/`slot.end` remain UTC ISO-8601 instants.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `daily-availability`: the day window is defined in the request's `tz` (default UTC) instead of always midnight-UTC; the endpoint accepts a `tz` query parameter.
- `calendar-integration`: `getEventsForDate` queries the window defined by the request's timezone rather than a server-local-derived window, and is given the window rather than computing it from a bare date.

## Impact

- **API**: `GET /availability/:date` gains an optional `tz` query parameter. No change to the response envelope or slot representation.
- **Code**: `availability.controller.ts` (read `tz`), `availability.service.ts` (compute and thread the window), `google-calendar.service.ts` (accept the window, drop `setHours`), `ICalendarProvider` interface (signature change), and a new timezone utility under `common/`.
- **Cross-repo**: depends on the frontend sending `tz` and rendering slot instants in the same browser timezone; tracked separately in `zenith-fe`.
- **Dependencies**: none added — uses the built-in `Intl` API.
