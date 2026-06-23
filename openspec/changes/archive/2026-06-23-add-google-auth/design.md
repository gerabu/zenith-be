## Context

The NestJS backend is a stock scaffold with no auth, no database, and no persistence layer. `ARCHITECTURE.md` mandates: PostgreSQL via Docker + Prisma, the Repository Pattern via interfaces (services depend on `IUserRepository`, modules bind the Prisma implementation), the `{ success, data?, error? }` response envelope enforced by global interceptor/filter, and `class-validator` DTOs behind a global `ValidationPipe`.

The frontend (Next.js) handles the interactive Google OAuth login and holds the resulting Google token in its session. The backend never participates in the OAuth redirect dance — it only receives already-issued Google tokens as bearer credentials and must validate them on every request. This is a classic stateless resource-server pattern.

## Goals / Non-Goals

**Goals:**
- Validate Google-issued bearer tokens cryptographically on incoming requests (verify signature, issuer, audience, expiry).
- Expose the authenticated principal to controllers via a `JwtAuthGuard` + `@CurrentUser()` decorator.
- Persist authenticated users via `GET /auth/sync` (upsert), through `IUserRepository` → `PrismaUserRepository`.
- Stand up Prisma + Postgres (Docker) with a minimal `User` model.

**Non-Goals:**
- The OAuth login/redirect flow (owned by the FE).
- Token refresh, revocation, session management, logout.
- Credentials or any non-Google strategy.
- User profile management or deletion.

## Decisions

### Validate the Google **ID token** as a JWT (not the access token)
We verify Google's **ID token**, which is a signed JWT (JWS, RS256) whose claims (`sub`, `email`, `aud`, `iss`, `exp`) are verifiable offline against Google's published JWKS. The FE sends the ID token as the bearer credential.

- **Why:** ID tokens are self-contained signed JWTs — verifiable cryptographically with Google's public keys, no per-request call to Google. Access tokens are opaque and would require a network round-trip to `tokeninfo`/`userinfo` on every request.
- **Alternative considered:** Validating the access token via Google's userinfo endpoint per request — rejected for latency, rate-limit exposure, and a hard dependency on Google availability for every call.

### Passport `passport-jwt` strategy with a JWKS-RSA key provider
Use `@nestjs/passport` + `passport-jwt`, configured to pull RRS256 public keys from Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`) via `jwks-rsa` with caching. Validate `issuer` ∈ {`https://accounts.google.com`, `accounts.google.com`} and `audience` = `GOOGLE_CLIENT_ID`.

- **Why:** Matches `ARCHITECTURE.md` ("Google JWT Strategy", "JwtAuthGuard"), keeps validation declarative, and JWKS caching keeps it fast and key-rotation-safe.
- **Alternative considered:** `google-auth-library`'s `OAuth2Client.verifyIdToken()` — solid, but bypasses the Passport guard/strategy ecosystem the rest of the app is expected to use.

### Strategy `validate()` returns token claims only; DB upsert is explicit at `/auth/sync`
The strategy's `validate()` returns a lightweight principal derived from token claims (`googleId=sub`, `email`, `name`) and does **not** touch the DB. The `User` row is created/updated only when the FE calls `GET /auth/sync`.

- **Why:** Keeps per-request auth fast and read-only; makes user creation an explicit, idempotent step the FE triggers once after login. Other endpoints can authenticate (and look up the user by `googleId`) without write amplification.
- **Trade-off:** A token can be valid before its `User` row exists. Acceptable: protected business endpoints will resolve the user by `googleId`, and the FE is expected to call `/auth/sync` immediately post-login.

### `@CurrentUser()` decorator exposes the validated principal
A `createParamDecorator` reads `request.user` (populated by Passport) so controllers never parse headers/claims directly.

### Repository pattern with an interface token
`IUserRepository` defined as an interface + an injection token (`'IUserRepository'` / a `Symbol`). The auth module binds it to `PrismaUserRepository` via a custom provider; the controller/service depend on the token.

- **Why:** Direct mandate of `ARCHITECTURE.md`; keeps Prisma out of controllers and makes the repo swappable/testable.

### Minimal `User` model
```prisma
model User {
  id        String   @id @default(uuid())
  googleId  String   @unique   // Google "sub" claim
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
Upsert keyed on `googleId` (stable per Google account), updating `email`/`name` on each sync.

## Risks / Trade-offs

- **Misconfigured `aud`/`iss` accepts foreign tokens** → strictly validate `audience = GOOGLE_CLIENT_ID` and the Google issuer set; fail closed if env vars are missing at boot.
- **JWKS fetch latency / Google key rotation** → use `jwks-rsa` with key caching + rate limiting; cache survives short Google blips.
- **Clock skew rejecting valid tokens** → allow a small `clockTolerance` in JWT verification.
- **Valid token without a `User` row** (see decision above) → `/auth/sync` is idempotent upsert; document that the FE calls it right after login.
- **Prisma client not generated in CI/dev** → `prisma generate` runs on install/postinstall and is part of the task list; `docker-compose up` must precede `migrate dev`.

## Migration Plan

1. Add deps, `docker-compose.yml`, and `.env` keys (`DATABASE_URL`, `GOOGLE_CLIENT_ID`).
2. Add Prisma schema + initial migration; `docker compose up -d` then `prisma migrate dev`.
3. Add `PrismaModule`/`PrismaService`, `AuthModule` (strategy, guard, decorator, repository binding), wire into `AppModule`.
4. No rollback complexity — feature is additive (new module, new table, new endpoint). Rollback = drop the migration and remove the module wiring.

## Open Questions

- Confirm the FE sends the **ID token** (not access token) as the bearer credential — the design assumes ID token. If access tokens are required, switch to `verifyIdToken`/userinfo validation.
