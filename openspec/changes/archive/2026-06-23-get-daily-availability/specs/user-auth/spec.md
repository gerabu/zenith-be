# user-auth Delta Specification

## MODIFIED Requirements

### Requirement: Synchronize authenticated user into the system

The system SHALL provide an authenticated `GET /auth/sync` endpoint that upserts the caller into the database from the validated token claims and returns the resulting user record. The operation SHALL be idempotent: calling it multiple times for the same Google account MUST NOT create duplicate user records, and MUST update mutable fields (email, name) from the latest token claims. Users SHALL be uniquely identified by their Google subject identifier.

The controller handler SHALL return a plain value (the user DTO); the global `ResponseInterceptor` SHALL wrap it in `{ success: true, data: <user> }`. The handler SHALL NOT construct the envelope itself.

#### Scenario: First sync creates the user

- **WHEN** an authenticated caller whose Google account has no existing user record calls `GET /auth/sync`
- **THEN** the system creates a new user record from the token claims (Google subject identifier, email, name)
- **AND** returns `{ "success": true, "data": <user> }` with HTTP 200

#### Scenario: Subsequent sync updates the existing user

- **WHEN** an authenticated caller whose Google account already has a user record calls `GET /auth/sync`
- **THEN** the system does not create a duplicate record
- **AND** updates the existing record's mutable fields (email, name) from the current token claims
- **AND** returns `{ "success": true, "data": <user> }` with HTTP 200

#### Scenario: Unauthenticated sync is rejected

- **WHEN** `GET /auth/sync` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized` and `{ "success": false, "error": <message> }`
