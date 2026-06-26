## Why

The API is feature-complete but undocumented — there is no machine- or human-readable contract for consumers (the frontend, future integrators) to discover endpoints, payloads, and error shapes. We need interactive OpenAPI/Swagger documentation, and because the spec exposes the full surface of the API, the docs page must be access-controlled rather than public.

## What Changes

- Add interactive Swagger UI served at `/docs`, generated from `@nestjs/swagger`, covering all 5 endpoints across the `auth`, `availability`, and `bookings` controllers.
- Document each endpoint with a summary/description, request schema (DTOs), response schema, and the **real** HTTP status codes each handler can return (derived from the exceptions thrown, not boilerplate).
- Accurately document the uniform response envelope: success responses are wrapped as `{ success: true, data: T }` and errors as `{ success: false, error: string }`. Swagger introspects the inner `data` type by default, so a reusable envelope wrapper is required to avoid documenting a misleading (unwrapped) shape.
- Add `@ApiBearerAuth` so the Google JWT bearer scheme is documented and usable from the "Authorize" button in Swagger UI.
- Introduce a `TimelineBlockDto` so `GET /availability/:date` has a documentable response class (it currently returns the raw domain `TimelineBlock[]`).
- Password-protect the docs via HTTP Basic Auth using credentials from env vars (`SWAGGER_USER` + `SWAGGER_PASSWORD`). Both the UI route (`/docs`) and the raw spec route (`/docs-json`) are protected. **Fail-closed:** when the env vars are not set, the docs are not mounted at all.

## Capabilities

### New Capabilities
- `api-documentation`: Swagger/OpenAPI documentation generation, per-endpoint schema and status-code coverage, accurate response-envelope representation, bearer-auth documentation, and Basic-Auth access control over the docs routes driven by env vars.

### Modified Capabilities
<!-- None: existing endpoint behavior is unchanged. This change only adds documentation metadata and a docs route; it does not alter request/response behavior of the documented endpoints. -->

## Impact

- **Dependencies:** add `@nestjs/swagger` and `express-basic-auth`.
- **Code:**
  - `src/main.ts` — `DocumentBuilder` setup, bearer scheme, Basic-Auth middleware on docs routes, fail-closed mounting.
  - `src/config/env.validation.ts` — add optional `SWAGGER_USER` and `SWAGGER_PASSWORD`.
  - `src/common/` — reusable `ApiEnvelopeResponse` decorator and an `ErrorResponseDto`.
  - `src/availability/` — new `TimelineBlockDto`.
  - DTOs (`auth`, `bookings`) — `@ApiProperty` field metadata.
  - Controllers (`auth`, `availability`, `bookings`) — `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`, `@ApiResponse` annotations.
- **Behavior:** no change to existing endpoint request/response behavior; purely additive (docs + a new guarded route).
