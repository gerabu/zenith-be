## 1. Booking Repository — write path

- [x] 1.1 Extend `IBookingRepository` in `src/bookings/interfaces/booking-repository.interface.ts` with `create(input: { userId: string; title: string; startTime: Date; endTime: Date }): Promise<Booking>`
- [x] 1.2 Implement `create` in `src/bookings/repositories/prisma-booking.repository.ts` via `prisma.booking.create`, returning the created record

## 2. Create Booking DTO

- [x] 2.1 Create `src/bookings/dto/create-booking.dto.ts` with `title` (`@IsString`, `@IsNotEmpty`), `startTime` and `endTime` (`@IsISO8601`) using `class-validator`

## 3. Bookings Service — confirmation rules

- [x] 3.1 Create `src/bookings/bookings.service.ts`; inject `IBookingRepository`, `ICalendarProvider`, and `IUserRepository`
- [x] 3.2 Resolve the persisted user from the JWT principal via `findByGoogleId`; throw `NotFoundException` if absent (mirrors `AvailabilityService`)
- [x] 3.3 Build the requested `TimeSlot` from the DTO; catch invariant violations and rethrow as `BadRequestException` (400)
- [x] 3.4 Gate on `user.calendarConnected` (and token presence) FIRST; throw `ForbiddenException` (403) with a distinct, frontend-actionable message before any conflict check (ADR-001)
- [x] 3.5 Derive the UTC day from `startTime`; fetch internal bookings (`findByUserAndDate`) and external events (`getEventsForDate`) in parallel
- [x] 3.6 Construct `DailyAvailability(internal, external)` and call `canBook(requestedSlot)`; throw `ConflictException` (409) when false
- [x] 3.7 Persist via `bookingRepository.create(...)` and return the created `Booking` (plain value — envelope applied globally)

## 4. Bookings Controller & Module wiring

- [x] 4.1 Create `src/bookings/bookings.controller.ts` with `POST /bookings` guarded by `JwtAuthGuard`, taking `@CurrentUser()` + `@Body() CreateBookingDto`, returning the service result (HTTP 201)
- [x] 4.2 Update `src/bookings/bookings.module.ts` to declare `BookingsController`, provide `BookingsService`, and import `GoogleCalendarModule`, `AuthModule` (for `USER_REPOSITORY`/guard), and `PrismaModule` as needed; keep `BOOKING_REPOSITORY` bound and exported
- [x] 4.3 Confirm `BookingsModule` is registered in `src/app.module.ts`

## 5. Tests

- [x] 5.1 Unit-test `BookingsService`: happy path, unconnected → 403, internal-conflict → 409, external-conflict → 409, invalid slot → 400, user-not-found → 404 (mock repository, calendar provider, user repository)
- [x] 5.2 Add/extend a `PrismaBookingRepository` spec covering `create`

## 6. Verification

- [x] 6.1 Run `pnpm lint` and `pnpm test`; confirm all pass
- [x] 6.2 Start `pnpm start:dev`; `POST /bookings` a valid non-conflicting slot → `{ success: true, data }` with 201
- [x] 6.3 Repeat the same slot → `{ success: false, error }` with 409; an unconnected user → 403; a malformed/invalid slot → 400
