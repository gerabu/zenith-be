## Why

Users can create bookings but have no way to remove them, so a mistaken or no-longer-needed slot stays blocked forever. The availability timeline also exposes `booked` slots without their internal booking `id`, so a frontend has no handle to act on (i.e. delete) a booking it sees on the timeline.

## What Changes

- Add `DELETE /bookings/:id`, protected by `JwtAuthGuard`, that deletes a booking owned by the authenticated user.
- Ownership is enforced: a user may only delete their own bookings. Attempting to delete another user's booking is rejected (treated as not found so booking existence is not leaked).
- The booking must exist: deleting a non-existent (or already-deleted) id returns `404`.
- Extend `IBookingRepository` with `findById` and `delete` so the service can verify existence/ownership and remove the record through the interface (no direct Prisma in controller/service).
- Include the internal booking `id` on `booked` timeline entries returned by `GET /availability/:date`, so clients can map a timeline slot back to the booking to delete. `available` and `external` entries are unaffected and carry no `id`.

## Capabilities

### New Capabilities
- `booking-deletion`: Authenticated, ownership-enforced deletion of an existing internal booking via `DELETE /bookings/:id`.

### Modified Capabilities
- `daily-availability`: `booked` timeline entries additionally include the internal booking `id`.
- `booking-persistence`: `IBookingRepository` gains `findById` and `delete` methods.

## Impact

- **API**: New `DELETE /bookings/:id` route; additive `id` field on `booked` availability timeline entries.
- **Code**: `BookingsController`, `BookingsService`, `IBookingRepository` + `PrismaBookingRepository`, the availability domain (`BusySlot` / `TimelineBlock` carrying an optional `id`), `AvailabilityService.toBusySlots`.
- **No schema migration**: the `Booking` model already has the required `id` and `userId` columns.
