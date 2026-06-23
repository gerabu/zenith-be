## 1. Schema & dependencies

- [ ] 1.1 Add nullable `googleAccessToken` and `googleRefreshToken`, plus `calendarConnected Boolean @default(false)`, to the `User` model in `prisma/schema.prisma`
- [ ] 1.2 Generate the migration (`prisma migrate dev`) and regenerate the Prisma client
- [ ] 1.3 Add the `googleapis` dependency via pnpm
- [ ] 1.4 Add required `GOOGLE_CLIENT_SECRET` to `src/config/env.validation.ts`

## 2. Persist tokens through auth sync

- [ ] 2.1 Add an optional `credentials?: { accessToken: string; refreshToken: string }` parameter to `IUserRepository.upsert`
- [ ] 2.2 Update `PrismaUserRepository.upsert` to write the token columns and set `calendarConnected = true` only when both tokens are present; preserve stored tokens and `calendarConnected` otherwise (new users default to `calendarConnected = false`)
- [ ] 2.3 Add a DTO that reads `googleAccessToken` / `googleRefreshToken` from request headers, with both fields optional and `class-validator` rules
- [ ] 2.4 Update `AuthController.sync` to read the optional tokens and pass them to `upsert`; confirm `UserResponseDto` does not expose the tokens
- [ ] 2.5 Update/extend repository and controller specs: new users default to `calendarConnected = false`; sync persists tokens and sets `calendarConnected = true` when supplied, and leaves stored tokens and `calendarConnected` unchanged when absent

## 3. Calendar provider abstraction

- [ ] 3.1 Create `src/google-calendar/interfaces/calendar-provider.interface.ts` defining `ICalendarProvider` (`getEventsForDate(user, date): Promise<TimeSlot[]>`) and a `CALENDAR_PROVIDER` injection token
- [ ] 3.2 Create `GoogleCalendarModule` binding `CALENDAR_PROVIDER` to `GoogleCalendarService` and exporting the token

## 4. GoogleCalendarService implementation

- [ ] 4.1 Implement the disconnected/missing-credentials short-circuit: return `[]` without any SDK/network call when `calendarConnected` is `false` or the access/refresh token is absent
- [ ] 4.2 Build an `OAuth2` client from `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, set credentials, and call `events.list` on `calendarId: 'primary'` with the requested date's `timeMin`/`timeMax`, `singleEvents: true`, `orderBy: 'startTime'`
- [ ] 4.3 Map each event to a `TimeSlot`: skip events lacking `start.dateTime`/`end.dateTime`, and skip events that violate `TimeSlot` invariants (wrap construction in try/catch)
- [ ] 4.4 Treat API failures (revoked/expired credentials) as an empty list rather than propagating a 500

## 5. Tests

- [ ] 5.1 Unit-test `getEventsForDate`: returns `[]` when `calendarConnected` is `false` and when credentials are missing (asserts no SDK call)
- [ ] 5.2 Unit-test event→`TimeSlot` mapping: valid timed events map correctly; all-day/invalid events are excluded; empty day returns `[]`
- [ ] 5.3 Unit-test the date window (`timeMin`/`timeMax`) bounds the requested date correctly
- [ ] 5.4 Run `pnpm lint` and `pnpm test` green
