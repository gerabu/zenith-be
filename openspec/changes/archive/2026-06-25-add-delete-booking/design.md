## Context

`BookingsModule` currently supports only creation (`POST /bookings`) and read access for the availability layer. The `Booking` model already has `id` (UUID PK) and `userId` (FK to `User`), so deletion needs no schema change. The availability timeline (`GET /availability/:date`) returns `booked` blocks with a `title` but no identifier, so a client cannot map a visible slot back to the booking it wants to remove. This change adds deletion and surfaces the internal booking `id` on `booked` timeline entries to close that loop.

## Goals / Non-Goals

**Goals:**
- Allow an authenticated user to delete one of their own bookings via `DELETE /bookings/:id`.
- Enforce ownership and existence: only the owner can delete; a missing/foreign id yields `404`.
- Expose the internal booking `id` on `booked` availability timeline entries so clients have a deletion handle.

**Non-Goals:**
- Soft delete / audit trail / undo. Deletion is a hard `prisma.booking.delete`.
- Re-checking or mutating Google Calendar on deletion (internal bookings only).
- Adding `id` to `available` or `external` timeline entries.
- Bulk deletion or deletion by time range.

## Decisions

### Route shape: `DELETE /bookings/:id`
The resource id goes in the path, matching REST convention and the existing `:date` path-param style in `AvailabilityController`. The proposal phrasing "DELETE /bookings" is realized as `DELETE /bookings/:id`. Returns HTTP `204 No Content` on success — there is no resource left to represent, and the global response interceptor wraps a `null`/`undefined` body as `{ success: true, data: null }`. Alternative considered: returning the deleted booking with `200`; rejected as unnecessary payload for a delete.

### Ownership check via `findById` then `delete`
The service first calls `bookingRepository.findById(id)`; if the booking is absent **or** its `userId` differs from the caller's resolved user id, it throws `NotFoundException` (`404`). Only on an owned match does it call `bookingRepository.delete(id)`. We deliberately collapse "not found" and "not yours" into the same `404` so a user cannot probe which booking ids exist. Alternative considered: a single `deleteByIdAndUser(id, userId)` repository call; rejected because the explicit `findById` keeps the ownership/existence rule in the service (testable in isolation) rather than buried in a Prisma `where` clause, and gives a clean place to distinguish outcomes if that policy ever changes.

### Caller identity resolution mirrors `create`
As in `BookingsService.create`, the controller passes the `AuthenticatedUser` principal and the service resolves the domain user via `userRepository.findByGoogleId(principal.googleId)`, throwing `404` ("User not found; call /auth/sync first") if absent. Ownership compares `booking.userId === user.id`.

### Repository gains `findById` and `delete`
`IBookingRepository` is extended with `findById(id: string): Promise<Booking | null>` and `delete(id: string): Promise<void>`; `PrismaBookingRepository` implements them via `prisma.booking.findUnique` and `prisma.booking.delete`. Controllers/services stay decoupled from Prisma per the repository-pattern convention.

### Surfacing `id` on the timeline
`BusySlot` and `TimelineBlock` gain an optional `id?: string`. `AvailabilityService.toBusySlots` populates `id` from `Booking.id` for internal bookings. `DailyAvailability` threads the `id` through `booked` blocks only; external events carry no `id`, and split `available` gaps never have one. This is additive — existing consumers reading `slot`/`status`/`title` are unaffected.

## Risks / Trade-offs

- [Leaking booking existence via timing/error differences] → Both "not found" and "not owned" return identical `404` bodies, so existence is not disclosed.
- [`prisma.booking.delete` throws P2025 if the row vanishes between `findById` and `delete` (race)] → Acceptable: the net effect (booking gone) matches the user's intent; the surfaced error remains a `404`-class outcome. A future hardening could catch P2025 and treat it as already-deleted.
- [Timeline `id` shape change] → Additive optional field; no existing field is renamed or removed, so the response envelope contract is preserved.

## Migration Plan

No database migration. Deploy is code-only: extend repository interface + implementation, add controller route and service method, thread `id` through the availability domain. Rollback is reverting the deploy; no data changes to undo.
