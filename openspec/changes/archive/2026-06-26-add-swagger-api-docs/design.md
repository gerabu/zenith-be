## Context

The API is feature-complete (5 endpoints across `auth`, `availability`, `bookings`), all behind a Google JWT `JwtAuthGuard`. Two global pieces shape every response and must be reflected in the docs:

- `ResponseInterceptor` rewraps every successful controller return value as `{ success: true, data: T }`.
- `HttpExceptionFilter` rewrites every error as `{ success: false, error: string }`.

`@nestjs/swagger` introspects the **declared controller return type**, which is the inner `data` value — not the envelope. Documenting naively would therefore misrepresent every response. Additionally, `GET /availability/:date` returns the raw domain `type TimelineBlock[]` (a type alias, not a class), which Swagger cannot introspect.

Per prior decisions: docs are gated by `SWAGGER_USER` + `SWAGGER_PASSWORD` (Basic Auth), optional and fail-closed; DTO field metadata is authored manually with `@ApiProperty`.

## Goals / Non-Goals

**Goals:**
- Accurate, interactive OpenAPI docs at `/docs` for all 5 endpoints.
- Faithful representation of the success envelope and error envelope.
- Real per-endpoint status codes derived from the exceptions each handler/guard can raise.
- Bearer-auth documented and usable from the Swagger "Authorize" button.
- Docs access controlled by env-var Basic Auth, fail-closed when unset.

**Non-Goals:**
- No change to runtime request/response behavior of existing endpoints.
- No endpoints beyond the 5 currently implemented (e.g. `GET`/`DELETE /bookings` referenced in ARCHITECTURE.md but not yet built).
- No auto-generation via the `@nestjs/swagger` CLI plugin (manual `@ApiProperty` chosen).
- No published/exported static spec file or external hosting.

## Decisions

### Decision: Represent the envelope with a reusable `ApiEnvelopeResponse` decorator
Swagger sees only the inner `data` type. To document the real wire shape, introduce a generic decorator `ApiEnvelopeResponse(DtoClass, { status, description })` that composes, via `@ApiExtraModels` + `getSchemaPath`, an `allOf` schema: a base object `{ success: true }` plus `{ data: $ref(DtoClass) }`. For array payloads (availability timeline) the decorator supports an `isArray` form so `data` becomes an array of `$ref`.

- **Alternative considered:** annotate each controller with a hand-written inline schema per endpoint. Rejected — repetitive and drifts easily.
- **Alternative considered:** drop the interceptor and return the envelope explicitly from controllers. Rejected — out of scope and contradicts the established convention (controllers return plain values).

### Decision: One shared `ErrorResponseDto` for all error responses
Define `ErrorResponseDto { success: false; error: string }` once, decorated with `@ApiProperty`, and reference it from every `@ApiResponse` error declaration. This matches `HttpExceptionFilter`'s output exactly.

### Decision: New `TimelineBlockDto` for the availability response (mirror current shape)
Add a `TimelineBlockDto` class decorated with `@ApiProperty` and use it as the documented response type for `GET /availability/:date`. This gives Swagger a concrete class and aligns the endpoint with the project convention of mapping domain objects through a response DTO.

**The DTO mirrors the shape the endpoint already returns** — the raw domain `TimelineBlock` serializes with the time range nested under `slot` (because `TimeSlot`'s private `start`/`end` fields serialize as own properties). So the DTO is `{ slot: { start: string; end: string }, status: 'available' | 'booked' | 'external', title?: string, id?: string }`, with a nested `TimeSlotDto` for the range. This keeps the change non-breaking for the frontend, honoring the proposal's "no behavior change" commitment.

- **Alternative considered:** flatten to `{ status, start, end, title? }`. Rejected — it would change the wire shape the frontend already consumes, contradicting the proposal's no-behavior-change scope. A flatten can be proposed later as its own (breaking) change.

### Decision: Document the actual status codes per endpoint
Derived from the code:

| Endpoint | Success | Error codes |
|---|---|---|
| `GET /auth/sync` | 200 | 401 |
| `GET /auth/calendar-connection` | 200 | 401 |
| `PATCH /auth/calendar-connection` | 200 | 400 (validation), 401 |
| `GET /availability/:date` | 200 | 400 (bad date), 401, 404 (user not synced) |
| `POST /bookings` | 201 | 400 (validation / bad times), 401, 403, 404 (user not synced), 409 (overlap) |

`401` applies everywhere via `JwtAuthGuard`. `400` also covers the global `ValidationPipe` rejecting unknown/invalid fields. The 409 is the core domain rule (overlap with an existing booking or a calendar event).

### Decision: Basic-Auth middleware mounted before Swagger setup, fail-closed
In `main.ts`, read `SWAGGER_USER`/`SWAGGER_PASSWORD`. If **both** are present, mount `express-basic-auth({ users: { [user]: pass }, challenge: true })` on `/docs` (and ensure `/docs-json` is covered) before `SwaggerModule.setup('docs', ...)`. If either is missing, skip mounting entirely. Add both as `@IsOptional()` strings in `EnvironmentVariables` so boot does not fail when unset.

- **Alternative considered:** a NestJS guard/middleware on a docs controller. Rejected — `SwaggerModule.setup` registers an Express route directly; Express middleware is the simplest reliable gate, and it naturally covers both `/docs` and the `/docs-json` spec route.
- **Alternative considered:** gate on `NODE_ENV`. Rejected in favor of credential-presence gating, which is environment-agnostic and fail-closed.

## Risks / Trade-offs

- **Spec leak via `/docs-json`** → The full API surface is exposed if the JSON route is left open. Mitigation: confirm the Basic-Auth mount path covers `/docs-json` as well as `/docs` (verify the route prefix Swagger registers), not just the UI.
- **Documented shape drifts from runtime** → The envelope decorator is hand-maintained; if the interceptor/filter shape changes, docs could lie. Mitigation: a single `ApiEnvelopeResponse` + single `ErrorResponseDto` are the only two places to update.
- **Manual `@ApiProperty` drift** → Field metadata can fall out of sync with DTOs. Mitigation: small surface (~6 DTOs); kept in the DTO files themselves.
- **`express-basic-auth` typing/ESM** → Minor integration friction adding a non-Nest middleware. Mitigation: standard, widely-used package; mount via `app.use(path, handler)`.
- **Credentials in env** → Basic-Auth password lives in env vars; acceptable for a docs gate, not a high-security boundary. Mitigation: fail-closed default keeps prod docs off unless explicitly enabled.
