## ADDED Requirements

### Requirement: IBookingRepository supports finding and deleting a booking by id

The system SHALL extend `IBookingRepository` (DI token `BOOKING_REPOSITORY`) with a `findById(id: string): Promise<Booking | null>` method that returns the booking with the given id or `null` when none exists, and a `delete(id: string): Promise<void>` method that removes the booking with the given id. `PrismaBookingRepository` SHALL implement both via `PrismaService` (`findUnique` and `delete`). Consumers SHALL depend only on the interface, never on Prisma or the concrete implementation directly.

#### Scenario: Finding an existing booking by id

- **WHEN** `findById(id)` is called with the id of a persisted booking
- **THEN** the method returns that `Booking` record, including its `userId`

#### Scenario: Finding a non-existent booking by id

- **WHEN** `findById(id)` is called with an id that matches no booking
- **THEN** the method returns `null`

#### Scenario: Deleting a booking by id

- **WHEN** `delete(id)` is called with the id of a persisted booking
- **THEN** the booking row is removed and a subsequent `findById(id)` returns `null`
