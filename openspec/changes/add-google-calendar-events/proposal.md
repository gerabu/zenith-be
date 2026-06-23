## Why

The core domain rule is that a booking must be rejected when it overlaps an event in the user's Google Calendar (ADR-001, ADR-003). Today there is no way to read those events: the `google-calendar` module does not exist, and the OAuth tokens needed to call the Calendar API are never persisted. Without this, availability and booking conflict-checks cannot account for real calendar events.

## What Changes

- Persist the user's Google OAuth credentials: add nullable `googleAccessToken` and `googleRefreshToken` columns plus a `calendarConnected` boolean (default `false`) to the `User` table.
- Extend `GET /auth/sync` so the frontend can supply the access/refresh tokens (obtained after the user grants the Calendar scope) and have them persisted on upsert; supplying tokens sets `calendarConnected = true`. Identity sync still works when no tokens are supplied (login without calendar connection — ADR-001 "optional but blocking").
- Add the `google-calendar` module exposing `GoogleCalendarService` behind the `ICalendarProvider` interface.
- Implement `getEventsForDate(user, date)` using the `googleapis` SDK against the **primary** calendar only (ADR-003), returning a list of `TimeSlot` value objects converted from Google events.
- When `calendarConnected` is `false`, or the user has no access/refresh token, `getEventsForDate` returns an empty list (graceful, non-blocking — supports the read-only state in ADR-002).

## Capabilities

### New Capabilities
- `calendar-integration`: Fetching a user's primary Google Calendar events for a given date and exposing them as domain `TimeSlot`s through a provider abstraction, including the no-credentials (empty) behavior.

### Modified Capabilities
- `user-auth`: `GET /auth/sync` additionally accepts and persists the Google access/refresh tokens; the user record now stores these credentials.

## Impact

- **Schema/DB**: new migration adding `googleAccessToken`, `googleRefreshToken` (nullable) and `calendarConnected` (boolean, default `false`) to `User`.
- **Dependencies**: add `googleapis` SDK.
- **Code**: new `src/google-calendar/` slice (`GoogleCalendarModule`, `GoogleCalendarService`, `ICalendarProvider` interface + token); `src/auth/` sync flow and `IUserRepository` extended to write tokens; `prisma/schema.prisma`.
- **Config**: `GOOGLE_CLIENT_ID` already present; add `GOOGLE_CLIENT_SECRET` for the OAuth2 client used to refresh access tokens.
- **Out of scope**: managing (creating/updating/deleting) Google Calendar events; reading any calendar other than `primary`.
