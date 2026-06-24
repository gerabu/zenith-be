## 1. DTOs

- [x] 1.1 Create `src/auth/dto/connect-calendar.dto.ts` with `accessToken` (`@IsString`, `@IsNotEmpty`) and optional `refreshToken` (`@IsOptional`, `@IsString`, `@IsNotEmpty`).
- [x] 1.2 Create `src/auth/dto/calendar-connection-response.dto.ts` with `message: string` and `calendarConnected: boolean`, built via a private constructor and a static `connected()` factory that supplies the human-readable message and `calendarConnected: true`. Do not include tokens.

## 2. Repository

- [x] 2.1 Add `updateCalendarConnection(googleId: string, tokens: { accessToken: string; refreshToken?: string }): Promise<User>` to `IUserRepository` in `src/auth/interfaces/user-repository.interface.ts`.
- [x] 2.2 Implement `updateCalendarConnection` in `PrismaUserRepository` (`src/auth/repositories/prisma-user.repository.ts`): set `googleAccessToken` and `calendarConnected = true`, and set `googleRefreshToken` only when `refreshToken` is provided (omit-preserves-existing semantics).

## 3. Endpoint

- [x] 3.1 Add `PATCH /auth/calendar-connection` handler to `AuthController` (`src/auth/auth.controller.ts`): guarded by `JwtAuthGuard`, reads the principal via `@CurrentUser()`, takes the validated `ConnectCalendarDto` body, calls `updateCalendarConnection(principal.googleId, ...)`, and returns `CalendarConnectionResponseDto.connected()`.

## 4. Tests

- [x] 4.1 Unit-test `PrismaUserRepository.updateCalendarConnection`: writes both tokens + flag when refresh token present; omits `googleRefreshToken` from the update payload when absent.
- [x] 4.2 Unit-test the controller handler: delegates to the repository with the principal's googleId and returns the response DTO (message + `calendarConnected: true`, no tokens).
- [x] 4.3 Add/extend a `class-validator` test (or e2e) asserting a body missing `accessToken` is rejected with 400 and that `refreshToken` is optional.

## 5. Verify

- [x] 5.1 Run `pnpm lint` and `pnpm test` and confirm green.
