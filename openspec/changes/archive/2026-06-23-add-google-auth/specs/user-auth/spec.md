## ADDED Requirements

### Requirement: Bearer token authentication on protected requests

The system SHALL authenticate requests to protected endpoints using a bearer token supplied in the `Authorization: Bearer <token>` header. Requests to protected endpoints without a token, or with a malformed `Authorization` header, SHALL be rejected with `401 Unauthorized`.

#### Scenario: Missing Authorization header

- **WHEN** a request is made to a protected endpoint without an `Authorization` header
- **THEN** the system responds with `401 Unauthorized`
- **AND** the response body follows the error envelope `{ success: false, error: <message> }`

#### Scenario: Malformed Authorization header

- **WHEN** a request is made to a protected endpoint with an `Authorization` header that is not in the form `Bearer <token>`
- **THEN** the system responds with `401 Unauthorized`

### Requirement: Cryptographic validation of Google-issued tokens

The system SHALL validate the bearer token cryptographically as a Google-issued JWT, verifying the signature against Google's published public keys (JWKS), and verifying that the `issuer` is a Google issuer and the `audience` matches the configured Google client ID. Tokens that fail any of these checks, or that are expired, SHALL be rejected with `401 Unauthorized`. Validation SHALL NOT require a per-request network call to a Google userinfo/tokeninfo endpoint.

#### Scenario: Valid Google token

- **WHEN** a request carries a Google-issued token with a valid signature, a Google issuer, an audience equal to the configured client ID, and an unexpired `exp`
- **THEN** the system accepts the request
- **AND** the authenticated principal derived from the token claims (`sub`, `email`, `name`) is available to the handler

#### Scenario: Invalid signature

- **WHEN** a request carries a token whose signature does not verify against Google's JWKS
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Wrong audience

- **WHEN** a request carries a Google-signed token whose `audience` does not match the configured Google client ID
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Wrong issuer

- **WHEN** a request carries a token whose `issuer` is not a recognized Google issuer
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Expired token

- **WHEN** a request carries a Google token whose `exp` is in the past (beyond the allowed clock tolerance)
- **THEN** the system responds with `401 Unauthorized`

### Requirement: Authenticated principal exposed to handlers

The system SHALL expose the authenticated principal to route handlers via a dedicated accessor (`@CurrentUser()`), so that handlers do not parse the `Authorization` header or token claims directly.

#### Scenario: Handler reads the current user

- **WHEN** a protected handler executes after successful token validation
- **THEN** the handler can obtain the authenticated principal (including the Google subject identifier and email) via the `@CurrentUser()` accessor

### Requirement: Synchronize authenticated user into the system

The system SHALL provide an authenticated `GET /auth/sync` endpoint that upserts the caller into the database from the validated token claims and returns the resulting user record. The operation SHALL be idempotent: calling it multiple times for the same Google account MUST NOT create duplicate user records, and MUST update mutable fields (email, name) from the latest token claims. Users SHALL be uniquely identified by their Google subject identifier.

#### Scenario: First sync creates the user

- **WHEN** an authenticated caller whose Google account has no existing user record calls `GET /auth/sync`
- **THEN** the system creates a new user record from the token claims (Google subject identifier, email, name)
- **AND** returns the created user in the success envelope `{ success: true, data: <user> }`

#### Scenario: Subsequent sync updates the existing user

- **WHEN** an authenticated caller whose Google account already has a user record calls `GET /auth/sync`
- **THEN** the system does not create a duplicate record
- **AND** updates the existing record's mutable fields (email, name) from the current token claims
- **AND** returns the existing user in the success envelope

#### Scenario: Unauthenticated sync is rejected

- **WHEN** `GET /auth/sync` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized`
