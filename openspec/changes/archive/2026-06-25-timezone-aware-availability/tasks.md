## 1. Timezone utility

- [x] 1.1 Add a `common/` utility that returns the UTC instant of local midnight for a given `YYYY-MM-DD` date and IANA timezone, DST-aware via `Intl.DateTimeFormat` (no fixed offsets, no new dependency)
- [x] 1.2 Add a companion that returns the day window `{ start, end }` for a date + tz, where `end` is local midnight of the next calendar day
- [x] 1.3 Make an invalid/unknown IANA timezone fall back to UTC rather than throw
- [x] 1.4 Unit-test the utility: UTC, a positive-offset tz, a negative-offset tz, a DST-transition date, and an invalid tz (falls back to UTC)

## 2. Calendar provider window

- [x] 2.1 Change `ICalendarProvider.getEventsForDate` to receive the day window (`timeMin`/`timeMax` UTC instants) instead of a bare `date`
- [x] 2.2 Update `GoogleCalendarService.getEventsForDate` to use the passed window for `events.list`, removing the `setHours`/`toISOString` derivation
- [x] 2.3 Update calendar-integration tests to assert the exact `timeMin`/`timeMax` passed to the Google API and that results are independent of server-local time

## 3. Availability service & controller

- [x] 3.1 Read the optional `tz` query parameter in `availability.controller.ts` and pass it to the service
- [x] 3.2 In `availability.service.ts`, resolve the day window once via the timezone utility (default UTC) and thread it into the bookings query, the calendar fetch, and `DailyAvailability.getTimeline`
- [x] 3.3 Update `bookingRepository.findByUserAndDate` (and its implementation) to filter on the `[start, end)` window; update its tests
- [x] 3.4 Update availability tests: window resolved in provided tz, fallback to UTC on missing/invalid tz, and unchanged behavior for the no-tz path

## 4. Verification

- [x] 4.1 Run `pnpm lint` and `pnpm test` green
- [x] 4.2 Manually verify a UTC−5 viewer's 21:00 local event resolves into the correct local day window (request with `tz=America/New_York`)
