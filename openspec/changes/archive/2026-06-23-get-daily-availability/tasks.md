## 1. Database — Booking Schema

- [x] 1.1 Add `Booking` model to `prisma/schema.prisma` with fields: `id`, `userId`, `title`, `startTime`, `endTime`, `createdAt`, `updatedAt`; add reverse relation on `User`
- [x] 1.2 Run `pnpm prisma migrate dev --name add-booking` to generate and apply the migration
- [x] 1.3 Run `pnpm prisma generate` to regenerate the Prisma client

## 2. Booking Repository

- [x] 2.1 Create `src/bookings/interfaces/booking-repository.interface.ts` with `IBookingRepository` interface and `BOOKING_REPOSITORY` DI token; expose `findByUserAndDate(userId: string, date: Date): Promise<Booking[]>`
- [x] 2.2 Create `src/bookings/repositories/prisma-booking.repository.ts` implementing `IBookingRepository` via `PrismaService`; query bookings where `userId` matches and `startTime` falls within the UTC calendar day
- [x] 2.3 Create `src/bookings/bookings.module.ts` binding `BOOKING_REPOSITORY` to `PrismaBookingRepository` and exporting the provider

## 3. Global API Response Envelope

- [x] 3.1 Create `src/common/interfaces/api-response.interface.ts` with `ApiResponse<T>` interface
- [x] 3.2 Create `src/common/interceptors/response.interceptor.ts` implementing `NestInterceptor`; map successful return values to `{ success: true, data: value }`
- [x] 3.3 Create `src/common/filters/http-exception.filter.ts` implementing `ExceptionFilter`; map `HttpException` to `{ success: false, error: message }` and unhandled errors to `{ success: false, error: "Internal server error" }` with HTTP 500
- [x] 3.4 Update `src/main.ts` to register `ValidationPipe` (with `whitelist: true`, `forbidNonWhitelisted: true`), `ResponseInterceptor`, and `HttpExceptionFilter` globally

## 4. Availability Module

- [x] 4.1 Create `src/availability/availability.service.ts`: inject `IBookingRepository` and `ICalendarProvider`; implement `getTimeline(userId: string, user: User, dateStr: string)` that validates the date, fetches bookings and calendar events, constructs `DailyAvailability`, and returns `getTimeline(dayStart, dayEnd)`; catch calendar errors and fall back to empty external events
- [x] 4.2 Create `src/availability/availability.controller.ts` with `GET /availability?date=YYYY-MM-DD` protected by `JwtAuthGuard`; return the plain timeline array from `AvailabilityService`
- [x] 4.3 Create `src/availability/availability.module.ts` importing `BookingsModule` and `GoogleCalendarModule`, providing `AvailabilityService`, and declaring `AvailabilityController`
- [x] 4.4 Register `AvailabilityModule` in `src/app.module.ts`

## 6. Refinement

- [x] 6.1 Change `GET /availability?date=` to `GET /availability/:date` (required path param); update spec and controller — eliminates the optional-but-required query param inconsistency

## 5. Verification

- [x] 5.1 Run `pnpm test` and confirm all existing tests (domain, auth, calendar) still pass
- [x] 5.2 Start the server (`pnpm start:dev`) and call `GET /auth/sync` with a valid token; confirm response shape is `{ success: true, data: { ... } }`
- [x] 5.3 Call `GET /availability?date=YYYY-MM-DD` and confirm timeline is returned in the envelope
- [x] 5.4 Call `GET /availability` without a date and confirm `{ success: false, error: ... }` with HTTP 400
