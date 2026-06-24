## ADDED Requirements

### Requirement: Create booking endpoint

The system SHALL expose `POST /bookings`, protected by `JwtAuthGuard`, that creates a booking for the authenticated user from a JSON body of `{ title: string, startTime: string (ISO 8601), endTime: string (ISO 8601) }`. On success the endpoint SHALL persist the booking and return the created `Booking` with HTTP `201`, wrapped by the global response envelope as `{ success: true, data: <booking> }`.

#### Scenario: Authenticated user creates a valid, non-conflicting booking

- **WHEN** an authenticated user with a connected calendar `POST`s a valid `{ title, startTime, endTime }` that overlaps no existing booking or calendar event
- **THEN** the booking is persisted for that user and the response is `{ success: true, data: <booking> }` with HTTP `201`

#### Scenario: Request without a valid JWT is rejected

- **WHEN** `POST /bookings` is called without a valid JWT
- **THEN** the request is rejected with HTTP `401` and no booking is created

### Requirement: Connected calendar is required to book

The system SHALL require the authenticated user to have a connected Google Calendar before creating a booking (per ADR-001, calendar connection is a strict prerequisite for the create-booking command). When the user has not connected their calendar, the system SHALL reject the request with HTTP `403` and a distinct, frontend-actionable error message, and SHALL NOT persist any booking or perform the conflict check.

#### Scenario: Unconnected user is blocked from booking

- **WHEN** an authenticated user whose calendar is not connected `POST`s a booking
- **THEN** the request is rejected with HTTP `403` and `{ success: false, error: <calendar-connection message> }` and no booking is persisted

### Requirement: Reject bookings that conflict with bookings or calendar events

The system SHALL reject a booking that overlaps an existing internal booking **or** an event in the user's primary Google Calendar (ADR-003), evaluated at confirmation time. The system SHALL fetch the day's internal bookings and primary-calendar events, construct a `DailyAvailability`, and use `canBook(requestedSlot)` to decide. When `canBook` returns false, the system SHALL reject with HTTP `409` and persist nothing.

#### Scenario: Requested slot overlaps an existing booking

- **WHEN** an authenticated, connected user `POST`s a slot that overlaps one of their existing bookings
- **THEN** the request is rejected with HTTP `409` and no new booking is persisted

#### Scenario: Requested slot overlaps a Google Calendar event

- **WHEN** an authenticated, connected user `POST`s a slot that overlaps an event on their primary Google Calendar
- **THEN** the request is rejected with HTTP `409` and no new booking is persisted

#### Scenario: Calendar is re-checked at confirmation time

- **WHEN** a booking is confirmed
- **THEN** the system fetches the user's current calendar events for that day rather than relying on a previously listed availability

### Requirement: Validate the booking payload and slot

The system SHALL validate the request body with a `ValidationPipe`: `title` MUST be a non-empty string and `startTime` / `endTime` MUST be ISO 8601 date-time strings. The system SHALL further validate the requested slot against `TimeSlot` invariants (end after start, minimum 15 minutes, maximum 24 hours). Any validation failure SHALL be rejected with HTTP `400` and `{ success: false, error: <message> }`, and SHALL NOT persist a booking.

#### Scenario: Missing or empty title

- **WHEN** the request body omits `title` or provides an empty `title`
- **THEN** the request is rejected with HTTP `400` and no booking is persisted

#### Scenario: Malformed timestamps

- **WHEN** `startTime` or `endTime` is missing or not a valid ISO 8601 date-time
- **THEN** the request is rejected with HTTP `400` and no booking is persisted

#### Scenario: Slot violates TimeSlot invariants

- **WHEN** the requested slot ends before or at its start, is shorter than 15 minutes, or exceeds 24 hours
- **THEN** the request is rejected with HTTP `400` and no booking is persisted
