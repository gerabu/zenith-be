# calendar-integration Specification

## Purpose

Read-only access to a user's Google Calendar, exposing events as domain `TimeSlot` value objects through a provider abstraction. Enables conflict-checking against real calendar events at booking time and during availability computation, while degrading gracefully when the user has not connected their calendar.

## Requirements

### Requirement: Provider abstraction for calendar reads

The system SHALL expose calendar reads through an `ICalendarProvider` interface, bound via a DI token to a Google-backed implementation (`GoogleCalendarService`). Consumers (e.g. availability, bookings) SHALL depend on the interface, never on the Google SDK or `GoogleCalendarService` directly.

#### Scenario: Consumer depends on the abstraction

- **WHEN** a consuming service needs the user's calendar events
- **THEN** it obtains them through the injected `ICalendarProvider`
- **AND** it has no compile-time dependency on `googleapis` or the concrete `GoogleCalendarService`

### Requirement: Fetch primary calendar events for a date

`getEventsForDate` SHALL fetch events from the user's **primary** Google Calendar for the given date and return them as a list of domain `TimeSlot` value objects. No other calendar (secondary, shared, or subscribed) SHALL be queried.

#### Scenario: User has events on the requested date

- **WHEN** `getEventsForDate(user, date)` is called for a user with valid credentials who has timed events on that date in their primary calendar
- **THEN** the system queries only the `primary` calendar for that date's time window
- **AND** returns one `TimeSlot` per event, with start and end derived from each event's start/end times

#### Scenario: User has no events on the requested date

- **WHEN** `getEventsForDate(user, date)` is called for a user with valid credentials who has no events on that date
- **THEN** the system returns an empty list

### Requirement: Disconnected or credential-less users yield an empty list

When the user record has `calendarConnected` set to `false`, or has no `googleAccessToken` or no `googleRefreshToken`, `getEventsForDate` SHALL return an empty list and SHALL NOT call the Google Calendar API. This keeps calendar reads non-blocking for users who have not connected their calendar.

#### Scenario: User has not connected their calendar

- **WHEN** `getEventsForDate(user, date)` is called for a user whose `calendarConnected` is `false`
- **THEN** the system returns an empty list
- **AND** makes no request to the Google Calendar API

#### Scenario: Connected user is missing credentials

- **WHEN** `getEventsForDate(user, date)` is called for a user whose `googleAccessToken` or `googleRefreshToken` is null/absent
- **THEN** the system returns an empty list
- **AND** makes no request to the Google Calendar API

### Requirement: Events that cannot form a valid TimeSlot are excluded

The system SHALL only return `TimeSlot`s for events that have both a start and an end time and that satisfy `TimeSlot` invariants. Events that lack timed boundaries (e.g. all-day events with date-only values) or that would violate `TimeSlot` construction rules SHALL be skipped rather than cause the whole fetch to fail.

#### Scenario: All-day or untimed event present

- **WHEN** the primary calendar returns an event without a specific start/end time (e.g. an all-day event)
- **THEN** that event is excluded from the returned list
- **AND** other valid timed events on that date are still returned
