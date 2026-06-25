## MODIFIED Requirements

### Requirement: Fetch daily availability for a given date

The system SHALL expose `GET /availability/:date` (where `:date` is `YYYY-MM-DD`) as a protected endpoint. The date is a required path parameter; the endpoint does not accept a `date` query parameter and does not default to the current date. The endpoint SHALL accept an optional `tz` query parameter containing an IANA timezone name (e.g. `America/New_York`); the `:date` is interpreted as a calendar day in that timezone. When `tz` is absent or is not a valid IANA timezone, the system SHALL fall back to UTC. The response SHALL contain a timeline array where each entry has a `slot` (start and end as ISO-8601 strings, expressed as UTC instants) and a `status` of `available`, `booked`, or `external`. Each busy entry (`status` of `booked` or `external`) SHALL additionally include a `title` string identifying what occupies the slot: the `Booking.title` for `booked` entries and the Google Calendar event summary for `external` entries. Entries with `status` of `available` SHALL NOT include a title. When a busy source has no title (a booking with an empty title or a calendar event with no summary), the system SHALL emit an empty string for `title` rather than omitting the field on a busy entry. The day window SHALL span from midnight of the given date in the resolved timezone to midnight of the next day in that timezone, expressed internally as UTC instants. The same day window SHALL be used for the internal bookings query, the Google Calendar fetch, and the timeline boundaries.

#### Scenario: User has no bookings and no calendar events

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` with no internal bookings and no Google Calendar events on that date
- **THEN** the response is `{ success: true, data: [{ slot: { start, end }, status: "available" }] }` covering the full 24-hour window
- **AND** the single `available` entry has no `title` field

#### Scenario: Day window is resolved in the provided timezone

- **WHEN** an authenticated user calls `GET /availability/2024-06-15?tz=America/New_York`
- **THEN** the day window spans from `2024-06-15T00:00` to `2024-06-16T00:00` in `America/New_York`, i.e. `2024-06-15T04:00:00Z` to `2024-06-16T04:00:00Z`
- **AND** internal bookings, calendar events, and the timeline all use that same window

#### Scenario: Missing or invalid timezone falls back to UTC

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` with no `tz`, or with a `tz` that is not a valid IANA timezone
- **THEN** the day window spans from midnight UTC of the given date to midnight UTC of the next day
- **AND** the request still succeeds (an invalid `tz` does not cause an error response)

#### Scenario: User has a mix of internal bookings and external events

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` and has one internal booking titled "Dentist" from 09:00–10:00 UTC and one Google Calendar event with summary "Team sync" from 14:00–15:00 UTC on that date
- **THEN** the response timeline contains a `booked` slot for 09:00–10:00 with `title: "Dentist"`, an `external` slot for 14:00–15:00 with `title: "Team sync"`, and `available` slots (without a title) for the remaining windows

#### Scenario: Busy source has no title

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` and has a Google Calendar event with no summary, or a booking with an empty title, occupying part of the day
- **THEN** the corresponding busy timeline entry still appears with its `status` and a `title` of `""`

#### Scenario: Malformed date path parameter

- **WHEN** an authenticated user calls `GET /availability/not-a-date` with a value that is not a valid ISO date
- **THEN** the system responds with `400 Bad Request` and `{ success: false, error: <message> }`

#### Scenario: Unauthenticated request is rejected

- **WHEN** `GET /availability/2024-06-15` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized` and `{ success: false, error: <message> }`
