## Context

The app rejects bookings that conflict with the user's Google Calendar (ADR-001, ADR-003), but nothing currently reads the calendar. Authentication uses Google **ID tokens** validated as JWTs (`GoogleJwtStrategy`); that flow never sees the OAuth **access/refresh tokens** required by the Calendar API. We must (a) persist those tokens and (b) build a `google-calendar` slice that fetches the primary calendar's events and maps them to the existing `TimeSlot` value object (`src/availability/domain/time-slot.vo.ts`).

Constraints:
- Repository pattern via interfaces — consumers depend on `ICalendarProvider`, never the SDK (CLAUDE.md convention 2).
- Primary calendar only; one REST call (ADR-003).
- Calendar connection is "optional but blocking" — reads must degrade gracefully to an empty list when the user hasn't connected (ADR-001/002).

## Goals / Non-Goals

**Goals:**
- Add nullable `googleAccessToken` / `googleRefreshToken` and a `calendarConnected` boolean (default `false`) to `User` (write path is a separate change).
- Provide `GoogleCalendarService implements ICalendarProvider` with `getEventsForDate(user, date): Promise<TimeSlot[]>`, fetching only `primary`.
- Return `[]` when `calendarConnected` is `false` or credentials are missing; skip events that can't form a valid `TimeSlot`.

**Non-Goals:**
- Creating/updating/deleting calendar events (read-only).
- Reading any calendar other than `primary`.
- The endpoint that writes calendar credentials to the user record (separate change).
- Encryption-at-rest of tokens (noted as a risk; out of scope for this change).

## Decisions

### D1: `google-calendar` slice layout
```
src/google-calendar/
  google-calendar.module.ts
  google-calendar.service.ts            // implements ICalendarProvider
  interfaces/calendar-provider.interface.ts   // ICalendarProvider + CALENDAR_PROVIDER token
```
`GoogleCalendarModule` binds `{ provide: CALENDAR_PROVIDER, useClass: GoogleCalendarService }` and exports the token so `availability`/`bookings` inject the interface (mirrors the `USER_REPOSITORY` pattern in `auth.module.ts`).

### D2: Google client construction & event fetch
- Use `googleapis`. Build an `OAuth2` client per call seeded with `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` and `setCredentials({ access_token, refresh_token })`. The SDK auto-refreshes the access token from the refresh token when expired, so we don't pre-check expiry.
- Call `calendar.events.list({ calendarId: 'primary', timeMin, timeMax, singleEvents: true, orderBy: 'startTime' })` where `timeMin`/`timeMax` are the start/end of the requested date.
- `singleEvents: true` expands recurring events into concrete instances so each maps to one `TimeSlot`.

### D3: Event → TimeSlot mapping
- For each event, read `start.dateTime` / `end.dateTime`. If either is missing (all-day events expose `start.date` only), skip the event.
- Construct `new TimeSlot({ start, end })` inside a try/catch; on a thrown invariant error (zero-length, end-before-start, or the 2-hour cap), skip that event rather than fail the whole fetch. Real calendar events can exceed 2h, so swallowing the cap error and excluding them is the pragmatic MVP choice (see risk).

### D4: Disconnected / missing-credentials short-circuit
At the top of `getEventsForDate`, if `calendarConnected` is `false`, or `accessToken`/`refreshToken` is falsy, return `[]` immediately — no SDK client, no network call. `calendarConnected` is the primary gate (cheap boolean reflecting whether the user ever connected); the credential check is a defensive fallback.

### D5: Config
Add `GOOGLE_CLIENT_SECRET` to `EnvironmentVariables` (required) for the OAuth2 client. `GOOGLE_CLIENT_ID` already exists.

## Risks / Trade-offs

- **Tokens stored in plaintext** → Acceptable for MVP; flagged for a follow-up to encrypt at rest. Refresh tokens are long-lived secrets.
- **`TimeSlot`'s 2-hour cap excludes long real events** → Such events would be silently dropped from conflict checks, allowing a booking to overlap them. Documented limitation; revisit whether the calendar-read path needs a cap-free slot type. For now we exclude rather than crash.
- **Revoked/expired refresh token** → `events.list` will reject; catch and treat as "no events" (empty list) so a bad connection doesn't 500 availability. The user re-connects via a fresh `GET /auth/sync`.
- **Timezone correctness of date window** → `timeMin`/`timeMax` must bound the requested calendar date; off-by-one timezone bugs would fetch the wrong day. Covered by tests.

## Migration Plan

1. Add `googleAccessToken` / `googleRefreshToken` (nullable) and `calendarConnected` to `prisma/schema.prisma`; `prisma migrate dev` generates the migration. Nullable ⇒ backward compatible, no backfill.
2. Add `googleapis` dependency; add `GOOGLE_CLIENT_SECRET` env var.
3. Ship the `google-calendar` module.
- Rollback: revert code; the nullable columns are inert and can be dropped in a later migration if needed.

## Open Questions

- Should long (>2h) calendar events be representable for conflict-checking, or is exclusion acceptable beyond MVP? (Tracked as a risk.)
