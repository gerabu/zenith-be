# booking-deletion Specification

## Purpose

Allow an authenticated user to delete one of their own internal bookings via `DELETE /bookings/:id`, enforcing ownership without disclosing the existence of bookings that belong to other users.

## Requirements

### Requirement: Delete booking endpoint

The system SHALL expose `DELETE /bookings/:id`, protected by `JwtAuthGuard`, that deletes the booking identified by the `:id` path parameter for the authenticated user. The caller's domain user SHALL be resolved from the authenticated principal (via `findByGoogleId`); if no such user exists, the system SHALL respond with HTTP `404`. On a successful delete the system SHALL remove the booking and respond with HTTP `204 No Content`, wrapped by the global response envelope as `{ success: true, data: null }`.

#### Scenario: Authenticated owner deletes an existing booking

- **WHEN** an authenticated user calls `DELETE /bookings/:id` for a booking that exists and belongs to them
- **THEN** the booking is removed and the response is `{ success: true, data: null }` with HTTP `204`

#### Scenario: Request without a valid JWT is rejected

- **WHEN** `DELETE /bookings/:id` is called without a valid JWT
- **THEN** the request is rejected with HTTP `401` and no booking is deleted

### Requirement: Only the owner may delete a booking

The system SHALL only delete a booking whose `userId` matches the authenticated user's id. When the booking belongs to a different user, the system SHALL reject the request with HTTP `404` and delete nothing, using the same response as a non-existent booking so that booking existence is not disclosed to non-owners.

#### Scenario: User attempts to delete another user's booking

- **WHEN** an authenticated user calls `DELETE /bookings/:id` for a booking owned by a different user
- **THEN** the request is rejected with HTTP `404` and `{ success: false, error: <message> }` and the booking is not deleted

### Requirement: Booking must exist to be deleted

The system SHALL verify the booking exists before deleting it. When no booking matches the given `:id`, the system SHALL respond with HTTP `404` and `{ success: false, error: <message> }`.

#### Scenario: Deleting a non-existent booking id

- **WHEN** an authenticated user calls `DELETE /bookings/:id` with an id that matches no booking
- **THEN** the request is rejected with HTTP `404` and nothing is deleted

#### Scenario: Deleting an already-deleted booking is idempotent in effect

- **WHEN** an authenticated user calls `DELETE /bookings/:id` for a booking that was already deleted
- **THEN** the request is rejected with HTTP `404` and no error other than not-found is surfaced
