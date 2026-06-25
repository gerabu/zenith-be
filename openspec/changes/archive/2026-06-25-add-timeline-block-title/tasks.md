## 1. Domain model

- [x] 1.1 Add an optional `title?: string` to `TimelineBlock` in `src/availability/domain/daily-availability.ts`
- [x] 1.2 Define a `BusySlot` type (`{ slot: TimeSlot; title: string }`) and change the `DailyAvailability` constructor to accept `BusySlot[]` for both internal and external inputs
- [x] 1.3 Carry the source title onto busy segments in `getTimeline`; leave `title` undefined on `available` segments
- [x] 1.4 Confirm `canBook` still ignores titles (overlap logic unchanged)

## 2. Calendar provider

- [x] 2.1 Define `CalendarEvent` (`{ slot: TimeSlot; title: string }`) and change `ICalendarProvider.getEventsForDate` to return `Promise<CalendarEvent[]>`
- [x] 2.2 In `GoogleCalendarService.mapEventsToTimeSlots`, capture `event.summary ?? ''` as `title` and return `CalendarEvent[]`

## 3. Service wiring

- [x] 3.1 In `AvailabilityService.getTimeline`, map bookings to `BusySlot` using `Booking.title`, and pass calendar `CalendarEvent[]` straight through to `DailyAvailability`
- [x] 3.2 In `BookingsService.confirmBooking`, adapt internal slots and external events to `BusySlot[]` for the `DailyAvailability` constructor (titles unused by `canBook`)

## 4. Tests

- [x] 4.1 Update `daily-availability.spec.ts` for the new constructor input and assert busy blocks carry `title` while `available` blocks do not
- [x] 4.2 Update `google-calendar.service.spec.ts` to assert `summary` flows into `title` and missing summaries yield `""`
- [x] 4.3 Update `availability.service.spec.ts` to assert booking titles and event titles appear on the corresponding timeline blocks, including the empty-title case
- [x] 4.4 Update `bookings.service.spec.ts` if its calendar/booking mocks need the new shapes
- [x] 4.5 Run `pnpm lint` and `pnpm test` and confirm green
