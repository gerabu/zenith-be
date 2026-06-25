## Why

Calendar-connection state is currently only readable once at sign-in via `GET /auth/sync`, and is only written by `PATCH /auth/calendar-connection`. The frontend now needs to read the live connection state on every page render, so it needs a dedicated, cheap, side-effect-free read endpoint — the read counterpart to the existing PATCH.

## What Changes

- Add an authenticated `GET /auth/calendar-connection` endpoint that returns whether the caller's Google Calendar is currently connected, as `{ calendarConnected: boolean }`.
- Resolve the answer from the persisted `User.calendarConnected` flag via the existing `IUserRepository.findByGoogleId` lookup. A caller with no user record resolves to `false`.
- The endpoint is a pure read: idempotent, no user upsert, no outbound Google calls — cheap enough to call per render.
- Add a lean `CalendarConnectionStatusResponseDto` (only `calendarConnected`, with a static `from(boolean)` factory) so the body is exactly `{ calendarConnected: boolean }`. The existing `CalendarConnectionResponseDto` is not reused (it carries a `message` field and only expresses `true`).
- Reuse the existing `JwtAuthGuard` + `@CurrentUser()` auth; unauthenticated/invalid tokens return the same `401` as the other `/auth/*` endpoints.
- This is additive: `GET /auth/sync` and `PATCH /auth/calendar-connection` are unchanged.

## Capabilities

### New Capabilities
<!-- None — this extends an existing capability. -->

### Modified Capabilities
- `user-auth`: Adds a new requirement for an authenticated, read-only `GET /auth/calendar-connection` endpoint that reports the persisted calendar-connection state.

## Impact

- **APIs:** New `GET /auth/calendar-connection` (protected by `JwtAuthGuard`). No changes to existing routes.
- **Code:** `AuthController` gains one handler; new `src/auth/dto/calendar-connection-status-response.dto.ts`. No new repository method (reuses `findByGoogleId`).
- **Contract docs:** `openspec/specs/user-auth/spec.md` gains a requirement block mirroring the existing PATCH one.
- **Dependencies / DB:** None.
