## 1. Response DTO

- [x] 1.1 Create `src/auth/dto/calendar-connection-status-response.dto.ts` with a single readonly `calendarConnected: boolean`, a private constructor, and a static `from(connected: boolean)` factory. Do not include `message` or any token fields.

## 2. Endpoint

- [x] 2.1 Add a `GET /auth/calendar-connection` handler to `AuthController` (`src/auth/auth.controller.ts`), placed alongside `sync` and `connectCalendar`: guarded by `JwtAuthGuard`, reads the principal via `@CurrentUser()`.
- [x] 2.2 In the handler, call `this.userRepository.findByGoogleId(principal.googleId)` and return `CalendarConnectionStatusResponseDto.from(user?.calendarConnected ?? false)`. No upsert, no write, no Google call. Do not construct the response envelope (the global `ResponseInterceptor` wraps it).

## 3. Tests

- [x] 3.1 Extend `src/auth/auth.controller.spec.ts` mirroring the existing `sync`/`connectCalendar` tests: connected user (`findByGoogleId` → user with `calendarConnected: true`) → result `calendarConnected === true`; user with `calendarConnected: false` → `false`; `findByGoogleId` → `null` → `false`.
- [x] 3.2 Assert the handler delegates to `findByGoogleId` with `principal.googleId` and performs no write (e.g. `upsert`/`updateCalendarConnection` mocks not called), and that the returned DTO has only `calendarConnected` (no `message`/token fields).

## 4. Contract docs

- [x] 4.1 Add the new requirement block to `openspec/specs/user-auth/spec.md` (from this change's `specs/user-auth/spec.md` delta), mirroring the existing PATCH requirement's structure. Leave `GET /auth/sync` and `PATCH /auth/calendar-connection` requirements unchanged.

## 5. Verification

- [x] 5.1 Run `pnpm lint` and `pnpm test -- auth.controller` and confirm both pass.
