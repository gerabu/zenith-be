## Why

The `User` model already has `calendarConnected`, `googleAccessToken`, and `googleRefreshToken` fields, but there is no way for a user to populate them. The frontend now owns the Google OAuth consent flow and obtains the user's calendar tokens, but the backend exposes no endpoint to persist them. Without this, no user can ever connect their calendar, so calendar-aware availability and conflict checks can never run for real accounts.

## What Changes

- Add an authenticated `PATCH /auth/calendar-connection` endpoint that accepts Google OAuth tokens in the request body and persists them to the caller's user record.
- Set `calendarConnected = true` and store `googleAccessToken` (and `googleRefreshToken` when present) on the authenticated user.
- Treat `refreshToken` as optional in the request body, since Google does not always return one on re-consent.
- Return a human-readable confirmation message and the `calendarConnected` flag (`true`) — not the full user or raw tokens.
- Extend `IUserRepository` with a method to update calendar-connection state, implemented by `PrismaUserRepository`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `user-auth`: Adds a new requirement for persisting frontend-supplied Google calendar tokens and flipping the `calendarConnected` flag via `PATCH /auth/calendar-connection`.

## Impact

- **Code:** `src/auth/auth.controller.ts` (new handler), new request/response DTOs under `src/auth/dto/`, `src/auth/interfaces/user-repository.interface.ts` and `src/auth/repositories/prisma-user.repository.ts` (new update method).
- **APIs:** New `PATCH /auth/calendar-connection` (protected by `JwtAuthGuard`).
- **Data:** Writes existing `User.calendarConnected`, `User.googleAccessToken`, `User.googleRefreshToken` columns — no schema migration required.
- **Security:** Access/refresh tokens are persisted but never returned in responses.
