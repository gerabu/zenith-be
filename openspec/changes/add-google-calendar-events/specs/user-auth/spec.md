## MODIFIED Requirements

### Requirement: Synchronize authenticated user into the system

The system SHALL provide an authenticated `GET /auth/sync` endpoint that upserts the caller into the database from the validated token claims and returns the resulting user record. The operation SHALL be idempotent: calling it multiple times for the same Google account MUST NOT create duplicate user records, and MUST update mutable fields (email, name) from the latest token claims. Users SHALL be uniquely identified by their Google subject identifier.

The endpoint SHALL additionally accept optional Google OAuth credentials (`googleAccessToken` and `googleRefreshToken`) supplied by the caller after the user grants the Calendar scope. When both are supplied they SHALL be persisted on the user record; when they are absent the sync SHALL still succeed and MUST NOT overwrite previously stored credentials with null. These credentials SHALL NOT be returned in the response body.

The user record SHALL carry a `calendarConnected` flag that defaults to `false` on creation. When a sync supplies both credentials, the system SHALL set `calendarConnected` to `true`. When a sync supplies no credentials, the system SHALL leave the existing `calendarConnected` value unchanged.

#### Scenario: First sync creates the user

- **WHEN** an authenticated caller whose Google account has no existing user record calls `GET /auth/sync`
- **THEN** the system creates a new user record from the token claims (Google subject identifier, email, name)
- **AND** the new record's `calendarConnected` is `false`
- **AND** returns the created user in the success envelope `{ success: true, data: <user> }`

#### Scenario: Subsequent sync updates the existing user

- **WHEN** an authenticated caller whose Google account already has a user record calls `GET /auth/sync`
- **THEN** the system does not create a duplicate record
- **AND** updates the existing record's mutable fields (email, name) from the current token claims
- **AND** returns the existing user in the success envelope

#### Scenario: Sync with calendar credentials persists tokens and marks connected

- **WHEN** an authenticated caller calls `GET /auth/sync` and supplies a `googleAccessToken` and `googleRefreshToken`
- **THEN** the system persists both tokens on the user record
- **AND** sets `calendarConnected` to `true`
- **AND** the tokens are not included in the response body

#### Scenario: Sync without credentials preserves stored tokens and connection state

- **WHEN** an authenticated caller who previously connected their calendar calls `GET /auth/sync` without supplying tokens
- **THEN** the sync succeeds
- **AND** the previously stored `googleAccessToken` and `googleRefreshToken` are not overwritten with null
- **AND** the existing `calendarConnected` value is left unchanged

#### Scenario: Unauthenticated sync is rejected

- **WHEN** `GET /auth/sync` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized`
