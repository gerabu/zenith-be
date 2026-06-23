## 1. Schema & dependencies

- [x] 1.1 Add nullable `googleAccessToken` and `googleRefreshToken`, plus `calendarConnected Boolean @default(false)`, to the `User` model in `prisma/schema.prisma`
- [x] 1.2 Generate the migration (`prisma migrate dev`) and regenerate the Prisma client
- [x] 1.3 Add the `googleapis` dependency via pnpm
- [x] 1.4 Add required `GOOGLE_CLIENT_SECRET` to `src/config/env.validation.ts`

## 2. Calendar provider abstraction

- [x] 2.1 Create `src/google-calendar/interfaces/calendar-provider.interface.ts` defining `ICalendarProvider` (`getEventsForDate(user, date): Promise<TimeSlot[]>`) and a `CALENDAR_PROVIDER` injection token
- [x] 2.2 Create `GoogleCalendarModule` binding `CALENDAR_PROVIDER` to `GoogleCalendarService` and exporting the token

## 3. GoogleCalendarService implementation

- [x] 3.1 Implement the disconnected/missing-credentials short-circuit: return `[]` without any SDK/network call when `calendarConnected` is `false` or the access/refresh token is absent
- [x] 3.2 Build an `OAuth2` client from `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, set credentials, and call `events.list` on `calendarId: 'primary'` with the requested date's `timeMin`/`timeMax`, `singleEvents: true`, `orderBy: 'startTime'`
- [x] 3.3 Map each event to a `TimeSlot`: skip events lacking `start.dateTime`/`end.dateTime`, and skip events that violate `TimeSlot` invariants (wrap construction in try/catch)
- [x] 3.4 Treat API failures (revoked/expired credentials) as an empty list rather than propagating a 500

## 4. Tests

- [x] 4.1 Unit-test `getEventsForDate`: returns `[]` when `calendarConnected` is `false` and when credentials are missing (asserts no SDK call)
- [x] 4.2 Unit-test event→`TimeSlot` mapping: valid timed events map correctly; all-day/invalid events are excluded; empty day returns `[]`
- [x] 4.3 Unit-test the date window (`timeMin`/`timeMax`) bounds the requested date correctly
- [x] 4.4 Run `pnpm lint` and `pnpm test` green
