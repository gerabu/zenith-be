## Context

The frontend owns the Google OAuth consent flow and ends up holding the user's calendar `accessToken` (and sometimes a `refreshToken`). The backend's `User` model already has the columns to store these (`googleAccessToken`, `googleRefreshToken`, `calendarConnected`) — added in the initial Prisma schema — but no endpoint writes them. The existing `auth` slice follows established conventions: controllers inject `IUserRepository` via the `USER_REPOSITORY` token, repositories own all Prisma access, DTOs validate input with `class-validator`, response DTOs map through a static factory, and the global interceptor/filter enforce the `{ success, data/error }` envelope.

## Goals / Non-Goals

**Goals:**
- Let an authenticated user persist frontend-supplied Google tokens and flip `calendarConnected` to `true`.
- Handle the optional `refreshToken` correctly (omitted ⇒ keep existing value).
- Keep the existing auth-slice conventions (interface-injected repository, validated DTO, factory-built response DTO, global envelope).
- Never leak tokens back in the response.

**Non-Goals:**
- No schema/migration changes — the columns already exist.
- No token validation against Google, refresh, or expiry handling — the FE owns OAuth; we only persist what it sends.
- No disconnect/revoke endpoint (could be a future change).

## Decisions

**HTTP verb & route: `PATCH /auth/calendar-connection`.** PATCH because we partially update an existing user resource (connection state), matching the request wording. Lives in the existing `AuthController` under the `auth` prefix and is guarded by `JwtAuthGuard`, consistent with `GET /auth/sync`.

**Identify the user by token claims, not a body field.** The handler resolves the caller via `@CurrentUser()` (Google subject identifier), so a user can only ever connect *their own* calendar. The body carries only the tokens.

**Optional `refreshToken` semantics: omit ⇒ preserve.** Google omits the refresh token on re-consent. Rather than overwriting a previously stored token with `null`, the repository update only sets `googleRefreshToken` when a value is present. This is done by building the Prisma `update` payload conditionally. Alternative considered — always writing the field (null when absent) — was rejected because it would silently destroy a still-valid refresh token.

**New repository method `updateCalendarConnection(googleId, tokens)` on `IUserRepository`.** Keeps Prisma out of the controller and keeps the repository lean (no generic base abstraction), per ARCHITECTURE.md. Returns the updated `User`.

**Dedicated request and response DTOs.**
- `ConnectCalendarDto`: `accessToken` (`@IsString` + `@IsNotEmpty`), `refreshToken` (`@IsOptional` + `@IsString` + `@IsNotEmpty`). The global `ValidationPipe` (whitelist) strips unknown fields and rejects missing `accessToken`.
- `CalendarConnectionResponseDto`: `message: string` + `calendarConnected: boolean`, built via a static factory (per the project's response-DTO convention). It deliberately excludes the tokens so they never round-trip to the client.

## Risks / Trade-offs

- **Tokens stored in plaintext** → Out of scope to change here; same as the existing columns. Note for a future hardening change (encryption at rest).
- **FE could send an invalid/expired token we can't detect** → Acceptable: validation/refresh is the FE's responsibility for now; conflict-checking code already handles calendar fetch failures at use time.
- **`message` is human-readable copy** → Kept in the response DTO factory so wording lives in one place and is easy to adjust.
