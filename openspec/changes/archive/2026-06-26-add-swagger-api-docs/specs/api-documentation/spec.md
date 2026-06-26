## ADDED Requirements

### Requirement: Swagger UI is served at /docs

The system SHALL serve interactive Swagger UI at the `/docs` route, generated from `@nestjs/swagger` metadata, and SHALL expose the corresponding OpenAPI JSON document at `/docs-json`.

#### Scenario: Authorized user opens the docs UI
- **WHEN** an authorized user navigates to `/docs` with valid Basic-Auth credentials
- **THEN** the Swagger UI renders, listing all documented endpoints grouped by tag

#### Scenario: Raw OpenAPI spec is available
- **WHEN** an authorized user requests `/docs-json` with valid Basic-Auth credentials
- **THEN** the system returns the OpenAPI JSON document describing every documented endpoint

### Requirement: Docs routes are protected by Basic Auth from env vars

The system SHALL protect both `/docs` and `/docs-json` with HTTP Basic Auth, validating credentials against the `SWAGGER_USER` and `SWAGGER_PASSWORD` environment variables.

#### Scenario: Missing or wrong credentials are rejected
- **WHEN** a request to `/docs` or `/docs-json` is made without credentials or with credentials that do not match `SWAGGER_USER`/`SWAGGER_PASSWORD`
- **THEN** the system responds with HTTP 401 and a `WWW-Authenticate` challenge, and does not return the UI or the spec

#### Scenario: Correct credentials are accepted
- **WHEN** a request to `/docs` or `/docs-json` is made with credentials matching `SWAGGER_USER` and `SWAGGER_PASSWORD`
- **THEN** the system serves the requested resource

### Requirement: Docs are fail-closed when credentials are not configured

The system SHALL NOT mount the docs routes when either `SWAGGER_USER` or `SWAGGER_PASSWORD` is absent. `SWAGGER_USER` and `SWAGGER_PASSWORD` SHALL be optional environment variables so that startup succeeds without them.

#### Scenario: Docs disabled without credentials
- **WHEN** the application boots without `SWAGGER_USER` and/or `SWAGGER_PASSWORD` set
- **THEN** the application starts successfully and neither `/docs` nor `/docs-json` is mounted (requests to them yield the standard not-found response)

### Requirement: Every documented endpoint declares operation metadata and bearer auth

Each documented endpoint SHALL declare a tag, an operation summary/description, and — because every endpoint is protected by the JWT guard — the bearer-token security scheme, so the Swagger UI "Authorize" action can attach the token.

#### Scenario: Endpoint shows summary and auth requirement
- **WHEN** an authorized user views a documented endpoint in Swagger UI
- **THEN** the endpoint displays its summary/description, is grouped under its tag, and is marked as requiring a bearer token

### Requirement: Request and response schemas are documented per endpoint

Each documented endpoint SHALL document its request body schema (where applicable) and its success response schema. Request and response DTO fields SHALL carry type, description, and example metadata.

#### Scenario: Request body schema is shown
- **WHEN** an authorized user views `POST /bookings` or `PATCH /auth/calendar-connection`
- **THEN** the request body schema lists each field with its type, whether it is required, and an example

#### Scenario: Availability response has a documented schema
- **WHEN** an authorized user views `GET /availability/:date`
- **THEN** the success response documents an array of timeline blocks via a dedicated response DTO (rather than an untyped/raw domain shape)

### Requirement: Success responses are documented with the response envelope

The documented success response schema SHALL reflect the uniform envelope `{ success: true, data: T }`, where `T` is the endpoint's response DTO, rather than the unwrapped DTO alone.

#### Scenario: Success schema shows the wrapper
- **WHEN** an authorized user inspects the success response of any documented endpoint
- **THEN** the schema shows `success: true` and a `data` property typed as the endpoint's response DTO

### Requirement: Error responses are documented with real status codes

Each documented endpoint SHALL declare the HTTP error status codes it can actually return, derived from the exceptions its handler (and guard) can raise, and each error response SHALL use the envelope `{ success: false, error: string }`.

#### Scenario: Endpoint lists its real error codes
- **WHEN** an authorized user views a documented endpoint
- **THEN** the documented error responses include the status codes that handler can produce (e.g. 401 for unauthenticated requests; 400 for invalid input where applicable; 404 when a referenced resource is missing; 409 when a booking overlaps an existing booking or calendar event) and each shows the `{ success: false, error }` shape
