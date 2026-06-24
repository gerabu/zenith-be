# daily-availability Specification

## Purpose

Expose the authenticated user's availability for a single calendar day by merging internal database bookings and Google Calendar events into a timeline of available and busy slots.

## Requirements

### Requirement: Fetch daily availability for a given date

The system SHALL expose `GET /availability/:date` (where `:date` is `YYYY-MM-DD`) as a protected endpoint. The date is a required path parameter; the endpoint does not accept a `date` query parameter and does not default to the current date. The response SHALL contain a timeline array where each entry has a `slot` (start and end as ISO-8601 strings) and a `status` of `available`, `booked`, or `external`. The day window SHALL span from midnight UTC of the given date to midnight UTC of the next day.

#### Scenario: User has no bookings and no calendar events

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` with no internal bookings and no Google Calendar events on that date
- **THEN** the response is `{ success: true, data: [{ slot: { start, end }, status: "available" }] }` covering the full 24-hour window

#### Scenario: User has a mix of internal bookings and external events

- **WHEN** an authenticated user calls `GET /availability/2024-06-15` and has one internal booking from 09:00–10:00 UTC and one Google Calendar event from 14:00–15:00 UTC on that date
- **THEN** the response timeline contains slots with status `booked` for 09:00–10:00, `external` for 14:00–15:00, and `available` for the remaining windows

#### Scenario: Malformed date path parameter

- **WHEN** an authenticated user calls `GET /availability/not-a-date` with a value that is not a valid ISO date
- **THEN** the system responds with `400 Bad Request` and `{ success: false, error: <message> }`

#### Scenario: Unauthenticated request is rejected

- **WHEN** `GET /availability/2024-06-15` is called without a valid bearer token
- **THEN** the system responds with `401 Unauthorized` and `{ success: false, error: <message> }`

### Requirement: Google Calendar errors degrade gracefully

If the `ICalendarProvider` throws an error (e.g. API failure, expired credentials beyond graceful handling), the system SHALL treat external events as an empty list and still return a timeline based solely on internal bookings, rather than failing the whole request with 500.

#### Scenario: Calendar API fails at request time

- **WHEN** `GET /availability/2024-06-15` is called and `ICalendarProvider.getEventsForDate` throws an unexpected error
- **THEN** the response is `{ success: true, data: <timeline based on internal bookings only> }`
- **AND** the error is logged server-side
