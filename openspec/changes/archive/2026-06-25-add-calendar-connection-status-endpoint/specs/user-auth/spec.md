## ADDED Requirements

### Requirement: Report persisted Google calendar connection state

The system SHALL provide an authenticated `GET /auth/calendar-connection` endpoint that reports whether the caller currently has a persisted Google Calendar connection, identified by the Google subject identifier from the validated token claims.

The endpoint SHALL be a pure read: idempotent, with no user upsert, no write, and no outbound calls to Google. It SHALL resolve the result from the persisted `User.calendarConnected` flag via a single lookup by Google subject identifier. A caller with a persisted connection (`calendarConnected = true`) SHALL resolve to `true`; a caller whose record has `calendarConnected = false`, or who has no user record at all, SHALL resolve to `false`.

The handler SHALL return a plain value containing exactly `calendarConnected: boolean` and no other fields; the global `ResponseInterceptor` SHALL wrap it in `{ success: true, data: <result> }`. The response SHALL NOT include any access token, refresh token, or human-readable message, and the handler SHALL NOT construct the envelope itself.

#### Scenario: Connected user reports true

- **WHEN** an authenticated caller whose user record has `calendarConnected = true` calls `GET /auth/calendar-connection`
- **THEN** the system returns `{ "success": true, "data": { "calendarConnected": true } }` with HTTP 200
- **AND** the response body contains no other fields, no tokens, and no message
- **AND** no user record is created or modified and no call is made to Google

#### Scenario: User without a connection reports false

- **WHEN** an authenticated caller whose user record has `calendarConnected = false` calls `GET /auth/calendar-connection`
- **THEN** the system returns `{ "success": true, "data": { "calendarConnected": false } }` with HTTP 200

#### Scenario: Caller with no user record reports false

- **WHEN** an authenticated caller who has no persisted user record calls `GET /auth/calendar-connection`
- **THEN** the system returns `{ "success": true, "data": { "calendarConnected": false } }` with HTTP 200
- **AND** no user record is created

#### Scenario: Unauthenticated read attempt is rejected

- **WHEN** `GET /auth/calendar-connection` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized` and `{ "success": false, "error": <message> }`
