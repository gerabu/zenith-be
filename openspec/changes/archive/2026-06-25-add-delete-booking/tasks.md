## 1. Repository: find and delete by id

- [x] 1.1 Extend `IBookingRepository` in `src/bookings/interfaces/booking-repository.interface.ts` with `findById(id: string): Promise<Booking | null>` and `delete(id: string): Promise<void>`
- [x] 1.2 Implement both in `PrismaBookingRepository` using `prisma.booking.findUnique({ where: { id } })` and `prisma.booking.delete({ where: { id } })`
- [x] 1.3 Add unit tests in `prisma-booking.repository` spec covering `findById` (hit and `null` miss) and `delete`

## 2. Booking deletion service + endpoint

- [x] 2.1 Add `delete(principal: AuthenticatedUser, bookingId: string): Promise<void>` to `BookingsService`: resolve the user via `findByGoogleId` (throw `NotFoundException` if absent), `findById` the booking, throw `NotFoundException` when the booking is missing or `booking.userId !== user.id`, otherwise call `bookingRepository.delete(bookingId)`
- [x] 2.2 Add `DELETE :id` handler to `BookingsController` guarded by `JwtAuthGuard`, returning `204 No Content` (`@HttpCode(HttpStatus.NO_CONTENT)`), passing `@CurrentUser()` principal and the `:id` param to the service
- [x] 2.3 Add unit tests in `bookings.service.spec.ts` for: owner deletes successfully (delete called), foreign-owner booking → `404` (delete not called), non-existent id → `404`, unknown user → `404`

## 3. Surface booking id on the availability timeline

- [x] 3.1 Add optional `id?: string` to `BusySlot` and `TimelineBlock` in `src/availability/domain/daily-availability.ts`, and thread `id` through `booked` blocks (constructor mapping for internal bookings and `getTimeline` busy-block emission); leave `external` and `available` entries without an `id`
- [x] 3.2 Populate `id` from `Booking.id` in `AvailabilityService.toBusySlots` (`src/availability/availability.service.ts`)
- [x] 3.3 Update `daily-availability` domain/service specs to assert `booked` entries carry the booking `id` while `external`/`available` entries do not

## 4. Verify

- [x] 4.1 Run `pnpm lint` and `pnpm test`; confirm all booking and availability specs pass
