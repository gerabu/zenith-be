## ADDED Requirements

### Requirement: IBookingRepository supports creating bookings

The system SHALL extend `IBookingRepository` (DI token `BOOKING_REPOSITORY`) with a `create(input: { userId: string; title: string; startTime: Date; endTime: Date }): Promise<Booking>` method that persists a new booking and returns the created record. `PrismaBookingRepository` SHALL implement it via `PrismaService`. Consumers SHALL depend only on the interface, never on Prisma or the concrete implementation directly.

#### Scenario: Persisting a new booking

- **WHEN** `create({ userId, title, startTime, endTime })` is called with valid values
- **THEN** a `Booking` row is inserted for that user and the created `Booking` record (including its generated `id`) is returned

#### Scenario: Created booking is readable afterward

- **WHEN** a booking is created and then `findByUserAndDate(userId, startTime)` is called for the same UTC calendar day
- **THEN** the newly created booking is included in the returned results
