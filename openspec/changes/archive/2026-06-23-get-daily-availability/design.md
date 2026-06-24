## Context

The domain layer is complete: `TimeSlot` and `DailyAvailability` exist and are tested. `ICalendarProvider` is defined and bound to `GoogleCalendarService`. `IUserRepository` and `PrismaUserRepository` establish the repository pattern. What is missing: a `Booking` Prisma model, an `IBookingRepository`, the `AvailabilityModule` with its controller and service, and the global API envelope (interceptor + exception filter). `main.ts` is still the bare scaffold with no global pipes, interceptors, or filters.

The `auth.controller.ts` already returns a plain `UserResponseDto`; once the global interceptor is registered, the envelope wraps it automatically — no change to the controller logic is needed.

## Goals / Non-Goals

**Goals:**
- Expose `GET /availability?date=YYYY-MM-DD` that merges DB bookings and Google Calendar events into a `DailyAvailability` timeline.
- Add the `Booking` Prisma model and a database migration so internal bookings can be persisted and queried.
- Provide `IBookingRepository` + `PrismaBookingRepository` for read access from the availability layer.
- Enforce the `{ success, data/error }` envelope globally via a response interceptor and exception filter.
- Register `ValidationPipe`, the interceptor, and the filter in `main.ts`.

**Non-Goals:**
- Creating, updating, or deleting bookings (that is the bookings management change).
- Paginating or filtering the timeline beyond a single day.
- Modifying `DailyAvailability` or `TimeSlot` domain models.

## Decisions

### 1. `AvailabilityService` lives in the `availability/` slice and depends on two interfaces

The service injects `IBookingRepository` (DI token `BOOKING_REPOSITORY`) and `ICalendarProvider` (DI token `CALENDAR_PROVIDER`). It fetches internal bookings and external events for the requested date, constructs `DailyAvailability`, and calls `getTimeline(dayStart, dayEnd)`.

**Alternative considered:** putting availability logic inside the bookings slice. Rejected because ARCHITECTURE.md treats `availability/` as a separate vertical slice with its own domain.

### 2. `IBookingRepository` is declared in `src/bookings/interfaces/`; the availability module imports it

Bookings are a distinct domain concept. The repository interface belongs in the `bookings/` slice. The `AvailabilityModule` imports `BookingsModule` (or a dedicated `BookingRepositoryModule`) to get the provider binding. This prevents circular dependencies because `BookingsModule` does not need to import `AvailabilityModule`.

**Alternative considered:** declaring `IBookingRepository` inside `availability/`. Rejected because it would couple the two slices in the wrong direction.

### 3. Global response envelope via NestJS interceptor + exception filter in `common/`

- `ResponseInterceptor` (implements `NestInterceptor`) maps every successful return value to `{ success: true, data: value }`.
- `HttpExceptionFilter` (implements `ExceptionFilter`) catches `HttpException` and any unhandled error and maps them to `{ success: false, error: message }`.
- Both are registered in `main.ts` with `app.useGlobalInterceptors` / `app.useGlobalFilters`.

The `ApiResponse<T>` interface lives in `src/common/interfaces/api-response.interface.ts`.

**Alternative considered:** using class-based providers bound in `AppModule`. Rejected because global registration in `main.ts` is simpler and does not require injecting dependencies into the interceptor or filter for this use case.

### 4. Date parsing in the AvailabilityService, not the controller

The controller receives `date` as a raw query-string string and passes it to the service, which validates and parses it to midnight UTC of that date. The day window is `[00:00:00.000, 23:59:59.999]` UTC. If the string is not a valid ISO date the service throws a `BadRequestException`.

**Alternative considered:** using a custom `ParseDatePipe` in the controller. Could be added later; the service-level parse is simpler for now.

### 5. `Booking` model field set

```
model Booking {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String
  startTime DateTime
  endTime   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Minimal fields needed by the availability layer: `userId`, `startTime`, `endTime`. `title` is included because it is the core booking concept (named time slot) described in the app overview.

## Risks / Trade-offs

- **UTC assumption**: Day boundaries computed in UTC. If a future feature needs per-user timezones, the query window logic must change. → Acceptable for now; document in the endpoint contract.
- **All bookings fetched per day**: `IBookingRepository.findByUserAndDate` queries only for a single day; the query is naturally bounded. No pagination risk.
- **Google Calendar errors**: If `getEventsForDate` throws (network failure, expired token), the availability endpoint will return 500 unless the calendar service already handles this gracefully. The existing `GoogleCalendarService` returns an empty list for disconnected users but may propagate API errors. → The `AvailabilityService` should catch calendar errors and treat them as an empty external event list, logging the failure.

## Migration Plan

1. Add `Booking` model to `prisma/schema.prisma` and add the reverse relation on `User`.
2. Run `pnpm prisma migrate dev --name add-booking` to generate and apply the migration.
3. Implement `IBookingRepository`, `PrismaBookingRepository`, and `BookingsModule`.
4. Implement `AvailabilityService`, `AvailabilityController`, and `AvailabilityModule`; wire in `AppModule`.
5. Add `ResponseInterceptor`, `HttpExceptionFilter`, and `ApiResponse` interface in `common/`.
6. Update `main.ts` to register `ValidationPipe`, `ResponseInterceptor`, and `HttpExceptionFilter`.
7. Verify `GET /auth/sync` response is now wrapped in the envelope (no code change, just integration test).
