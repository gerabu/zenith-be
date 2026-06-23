## Why

The backend currently has no way to identify who is making a request — every endpoint is anonymous. Before users can book or view time slots, the system must authenticate them and persist their identity. Google is the chosen authentication provider, so the backend needs to accept Google-issued tokens, validate them cryptographically, and map each authenticated caller to a `User` record.

## What Changes

- Introduce **Google-backed bearer authentication**: every protected request carries an `Authorization: Bearer <token>` header containing a Google-issued token.
- Add a **Passport JWT strategy** that validates the token cryptographically against Google's OAuth2 public keys (issuer/audience checked) — no shared secret, no per-request round-trip to Google's userinfo endpoint required.
- Add a **`JwtAuthGuard`** to protect endpoints and a **`@CurrentUser()`** decorator to expose the authenticated user to controllers.
- Add **`GET /auth/sync`**: an authenticated endpoint that upserts the caller into the database from their token claims and returns the `User` record (the FE calls this once after login).
- Configure **Prisma + PostgreSQL** with a minimal `User` model, the `PrismaModule`/`PrismaService`, and an `IUserRepository` backed by `PrismaUserRepository`.
- Add a **`docker-compose.yml`** at the repo root running PostgreSQL for local development.

## Capabilities

### New Capabilities
- `user-auth`: Cryptographic validation of Google-issued bearer tokens on incoming requests, exposure of the authenticated principal to handlers, and synchronization (upsert) of authenticated users into the system database.

### Modified Capabilities
<!-- None — no existing specs. -->

## Impact

- **Dependencies (new):** `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa` (or equivalent for Google key fetching), `@nestjs/config`, `prisma`, `@prisma/client`, `class-validator`/`class-transformer` for any DTOs.
- **New modules:** `src/auth/` (strategy, guard, controller, `IUserRepository`, `PrismaUserRepository`), `src/prisma/` (`PrismaModule`, `PrismaService`), `src/common/` (`@CurrentUser()` decorator).
- **Database:** new Prisma schema (`prisma/schema.prisma`) with a `User` table and initial migration.
- **Infrastructure:** root `docker-compose.yml` for local Postgres; new env vars (`DATABASE_URL`, `GOOGLE_CLIENT_ID`, Google issuer/JWKS config).
- **API:** new `GET /auth/sync`; all future protected endpoints will rely on `JwtAuthGuard`.
- **Out of scope:** credentials/other Passport strategies, user profile management, user deletion, token refresh, and session/token revocation.
