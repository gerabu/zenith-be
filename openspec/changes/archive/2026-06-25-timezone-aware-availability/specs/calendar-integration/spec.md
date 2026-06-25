## MODIFIED Requirements

### Requirement: Fetch primary calendar events for a date

`getEventsForDate` SHALL fetch events from the user's **primary** Google Calendar for a caller-supplied time window and return them as a list of domain `TimeSlot` value objects. The method SHALL receive the day window (`timeMin`/`timeMax` as UTC instants) from its caller and SHALL NOT re-derive the window from a bare date using server-local time. No other calendar (secondary, shared, or subscribed) SHALL be queried.

#### Scenario: User has events in the requested window

- **WHEN** `getEventsForDate` is called for a user with valid credentials, given a `[timeMin, timeMax)` window in which the user has timed events in their primary calendar
- **THEN** the system queries only the `primary` calendar for that exact window
- **AND** returns one `TimeSlot` per event, with start and end derived from each event's start/end times

#### Scenario: Window is honored without server-local mutation

- **WHEN** `getEventsForDate` is called with a window `[timeMin, timeMax)`
- **THEN** the Google Calendar query uses those exact UTC instants for `timeMin` and `timeMax`
- **AND** the result does not depend on the server's local timezone

#### Scenario: User has no events in the requested window

- **WHEN** `getEventsForDate` is called for a user with valid credentials who has no events in the given window
- **THEN** the system returns an empty list
