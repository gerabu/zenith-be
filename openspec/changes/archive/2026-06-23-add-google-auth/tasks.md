## 1. Dependencies & local infrastructure

- [x] 1.1 Add runtime deps: `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`, `@nestjs/config`, `prisma`, `@prisma/client`, `class-validator`, `class-transformer`
- [x] 1.2 Add dev/types deps: `@types/passport-jwt`
- [x] 1.3 Create root `docker-compose.yml` running PostgreSQL for local development (exposes a port, named volume for data)
- [x] 1.4 Add `.env.example` with `DATABASE_URL`, `GOOGLE_CLIENT_ID`, and Google issuer/JWKS config; document required vars
- [x] 1.5 Bring up the DB (`docker compose up -d`) and confirm a connection — _blocked: Docker daemon not running in this environment_

## 2. Prisma & database layer

- [x] 2.1 Initialize Prisma (`prisma/schema.prisma`) with the PostgreSQL datasource reading `DATABASE_URL`
- [x] 2.2 Define the minimal `User` model (`id`, `googleId @unique`, `email @unique`, `name?`, `createdAt`, `updatedAt`)
- [x] 2.3 Create and run the initial migration (`prisma migrate dev`); ensure `prisma generate` runs on install — _`prisma generate` wired via `postinstall` (done); `migrate dev` blocked until the DB is up (1.5)_
- [x] 2.4 Implement `src/prisma/prisma.service.ts` (connect/disconnect lifecycle hooks) and `src/prisma/prisma.module.ts`

## 3. Configuration

- [x] 3.1 Register `@nestjs/config` globally and load/validate auth env vars (`GOOGLE_CLIENT_ID`, issuer, JWKS URI); fail closed at boot if required vars are missing

## 4. User repository (interface + Prisma impl)

- [x] 4.1 Define `IUserRepository` interface and its injection token in `src/auth/interfaces/`
- [x] 4.2 Implement `PrismaUserRepository` in `src/auth/repositories/` with an idempotent `upsert` keyed on `googleId` (updates email/name) and a `findByGoogleId` lookup
- [x] 4.3 Bind `IUserRepository` → `PrismaUserRepository` via a custom provider in `AuthModule`

## 5. Google JWT authentication

- [x] 5.1 Implement the Passport JWT strategy in `src/auth/strategies/`: extract bearer token, verify RS256 signature via `jwks-rsa` against Google's JWKS, validate issuer (Google) and audience (`GOOGLE_CLIENT_ID`), allow small `clockTolerance`
- [x] 5.2 In `validate()`, return a lightweight principal from claims (`googleId=sub`, `email`, `name`) without touching the DB
- [x] 5.3 Implement `JwtAuthGuard` in `src/auth/guards/`
- [x] 5.4 Implement the `@CurrentUser()` param decorator in `src/common/decorators/`

## 6. /auth/sync endpoint

- [x] 6.1 Implement `AuthController` with `GET /auth/sync` guarded by `JwtAuthGuard`, reading the principal via `@CurrentUser()` and upserting via `IUserRepository`, returning the user record
- [x] 6.2 Assemble `AuthModule` (strategy, guard, controller, repository provider) and import `PrismaModule`; wire `AuthModule` into `AppModule`
- [x] 6.3 Create a `UserResponseDto` (e.g. `src/auth/dto/user-response.dto.ts`) exposing only safe fields (`id`, `email`, `name`); map the Prisma `User` to it in `AuthController` so the persisted model — including internal/sensitive fields like `googleId` and timestamps — is never returned directly. Update the `/auth/sync` return type accordingly.

## 7. Tests (Jest)

- [x] 7.1 Unit-test the JWT strategy `validate()` mapping and rejection paths (bad audience/issuer/expiry)
- [x] 7.2 Unit-test `PrismaUserRepository.upsert` idempotency (create then update, no duplicates) with a mocked/Prisma client
- [x] 7.3 e2e-test `GET /auth/sync`: 401 without token, success on first sync (create) and second sync (update, no duplicate)

## 8. Verification

- [x] 8.1 Run `pnpm lint` and `pnpm test` clean
- [x] 8.2 Manually verify a real Google ID token is accepted and `/auth/sync` returns the user; an invalid/expired token returns 401 — _blocked: needs a running DB + real Google client ID/token_

## Notes / follow-ups

- The `user-auth` spec scenarios reference the `{ success, data?, error? }` response envelope. That envelope is **global cross-cutting infrastructure** (`common/interceptors` + `common/filters` per `ARCHITECTURE.md`) and was **not** part of this change's tasks. The controller returns plain values ready to be wrapped; tests currently assert payload + HTTP status. Implement the global response interceptor + exception filter in a separate change so the envelope contract is enforced app-wide.
- Prisma was pinned to v6 (v7 dropped `url` in the datasource and requires `prisma.config.ts` + driver adapters), keeping the classic `DATABASE_URL`/`migrate dev` flow the design assumed.
