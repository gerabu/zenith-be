## ADDED Requirements

### Requirement: Persist frontend-supplied Google calendar connection

The system SHALL provide an authenticated `PATCH /auth/calendar-connection` endpoint that persists Google OAuth tokens, supplied by the frontend in the request body, onto the authenticated caller's user record and marks the calendar as connected.

The request body SHALL contain an `accessToken` (required, non-empty string) and MAY contain a `refreshToken` (optional non-empty string). The `refreshToken` is optional because Google does not always return one on re-consent; when omitted, any previously stored refresh token SHALL be left unchanged.

On success the system SHALL store `googleAccessToken` (and `googleRefreshToken` when provided) and set `calendarConnected = true` on the caller's user record, identified by the Google subject identifier from the validated token claims. The endpoint SHALL be idempotent: repeated calls update the stored tokens and leave `calendarConnected = true`.

The handler SHALL return a plain value containing a human-readable confirmation message and `calendarConnected: true`; the global `ResponseInterceptor` SHALL wrap it in `{ success: true, data: <result> }`. The response SHALL NOT include the access token or refresh token, and the handler SHALL NOT construct the envelope itself.

#### Scenario: Connect calendar with access and refresh tokens

- **WHEN** an authenticated caller sends `PATCH /auth/calendar-connection` with a body containing both `accessToken` and `refreshToken`
- **THEN** the system stores both tokens on the caller's user record and sets `calendarConnected = true`
- **AND** returns `{ "success": true, "data": { "message": <human-readable string>, "calendarConnected": true } }` with HTTP 200
- **AND** the response body does not contain the access token or refresh token

#### Scenario: Connect calendar without a refresh token

- **WHEN** an authenticated caller sends `PATCH /auth/calendar-connection` with a body containing only `accessToken`
- **THEN** the system stores the access token and sets `calendarConnected = true`
- **AND** leaves any previously stored refresh token unchanged
- **AND** returns `{ "success": true, "data": { "message": <human-readable string>, "calendarConnected": true } }` with HTTP 200

#### Scenario: Missing access token is rejected

- **WHEN** an authenticated caller sends `PATCH /auth/calendar-connection` with a body that omits `accessToken` or supplies an empty value
- **THEN** the global `ValidationPipe` rejects the request with `400 Bad Request`
- **AND** the response body follows the error envelope `{ success: false, error: <message> }`

#### Scenario: Unauthenticated connection attempt is rejected

- **WHEN** `PATCH /auth/calendar-connection` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized` and `{ "success": false, "error": <message> }`
