## Context

`PATCH /auth/calendar-connection` persists Google OAuth tokens and sets `User.calendarConnected = true`. Until now, the frontend learned that state only once at sign-in via `GET /auth/sync`. It now needs to read live connection state on every page render, so a dedicated read endpoint is required. The auth scheme (`JwtAuthGuard` + `@CurrentUser()`), the repository (`IUserRepository.findByGoogleId`), and the response envelope (`ResponseInterceptor`) all already exist; this change composes them rather than introducing anything new.

## Goals / Non-Goals

**Goals:**
- Expose `GET /auth/calendar-connection` returning `{ calendarConnected: boolean }` for the authenticated caller.
- Keep it a pure, cheap read suitable for per-render polling.
- Match the structure, auth, and error conventions of the existing `/auth/*` handlers.

**Non-Goals:**
- No outbound Google calls; "connected" is not live-verified against Google.
- No user upsert or any write/side effect.
- No new repository method, no schema change, no changes to `GET /auth/sync` or `PATCH /auth/calendar-connection`.

## Decisions

**Resolve "connected" from the persisted `User.calendarConnected` flag.**
The handler calls the existing `findByGoogleId(principal.googleId)` and returns `user?.calendarConnected ?? false`.
- *Why over checking token presence (`googleAccessToken != null`):* The flag is the purpose-built, explicit state that PATCH sets atomically alongside the tokens; reading it answers exactly the question asked. The contract's "usable" cannot mean a live Google check (outbound calls are forbidden), so it collapses to "a persisted connection exists" — which the flag encodes. A caller with no user row resolves to `false` naturally.

**New lean `CalendarConnectionStatusResponseDto` with a static `from(boolean)` factory.**
- *Why over reusing `CalendarConnectionResponseDto`:* that DTO carries a `message` field and only has a `.connected()` factory hardcoded to `true`. The contract requires the body to be **exactly** `{ calendarConnected: boolean }` and must express `false`. A dedicated DTO honors the shape and matches the codebase convention of mapping through a response DTO with a static factory.

**Reuse existing auth and envelope.**
`@UseGuards(JwtAuthGuard)` + `@CurrentUser()` give the principal and produce the same `401` as the sibling endpoints. The handler returns the plain DTO; the global `ResponseInterceptor` wraps it as `{ success: true, data: { calendarConnected } }`. The handler never constructs the envelope.

## Risks / Trade-offs

- **Flag can drift from token reality** (e.g. a future "disconnect" path nulls tokens but not the flag) → today PATCH is the only writer and sets both together, so they cannot diverge. If a disconnect flow is added later, it must clear the flag; the spec scenarios pin the flag as the source of truth so that contract is explicit.
- **Stale flag vs. Google-side revocation** → out of scope by design; this endpoint reports persisted intent, not live Google validity. Booking-time logic already tolerates a revoked connection separately.
