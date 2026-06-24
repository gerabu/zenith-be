# booking-persistence Specification

## Purpose

Persist internal bookings to PostgreSQL via a `Booking` Prisma model, and expose read access through an `IBookingRepository` interface so the availability layer can query bookings without coupling to Prisma directly.

## Requirements

### Requirement: Booking model in the database

The system SHALL maintain a `Booking` table in PostgreSQL with at minimum the fields: `id` (UUID primary key), `userId` (foreign key to `User`), `title` (string), `startTime` (timestamp), `endTime` (timestamp), `createdAt`, and `updatedAt`. The schema SHALL be managed via a Prisma migration.

#### Scenario: Booking schema is applied

- **WHEN** `prisma migrate dev` is run against a clean database
- **THEN** the `Booking` table is created with all required columns and a foreign key constraint on `userId` referencing `User.id`

### Requirement: IBookingRepository interface for read access

The system SHALL expose an `IBookingRepository` interface (DI token `BOOKING_REPOSITORY`) with a `findByUserAndDate(userId: string, date: Date): Promise<Booking[]>` method. The implementation SHALL return all bookings for the given user whose `startTime` falls within the calendar day of `date` (UTC). Consumers SHALL depend only on the interface, never on Prisma or the concrete implementation directly.

#### Scenario: User has bookings on the requested date

- **WHEN** `findByUserAndDate(userId, date)` is called for a user who has bookings with `startTime` on that UTC calendar day
- **THEN** the method returns all matching `Booking` records

#### Scenario: User has no bookings on the requested date

- **WHEN** `findByUserAndDate(userId, date)` is called for a user with no bookings on that day
- **THEN** the method returns an empty array

#### Scenario: Bookings on adjacent dates are excluded

- **WHEN** `findByUserAndDate(userId, date)` is called
- **THEN** bookings whose `startTime` falls on a different UTC calendar day are NOT included in the result

### Requirement: PrismaBookingRepository implements IBookingRepository

The system SHALL provide a `PrismaBookingRepository` class that implements `IBookingRepository` using `PrismaService`. It SHALL be bound to the `BOOKING_REPOSITORY` DI token in `BookingsModule` and exported so other modules can inject it.

#### Scenario: Availability module uses the repository through the interface

- **WHEN** `AvailabilityService` is instantiated via DI
- **THEN** it receives an `IBookingRepository` implementation with no compile-time dependency on `PrismaService` or `PrismaBookingRepository`

### Requirement: IBookingRepository supports creating bookings

The system SHALL extend `IBookingRepository` (DI token `BOOKING_REPOSITORY`) with a `create(input: { userId: string; title: string; startTime: Date; endTime: Date }): Promise<Booking>` method that persists a new booking and returns the created record. `PrismaBookingRepository` SHALL implement it via `PrismaService`. Consumers SHALL depend only on the interface, never on Prisma or the concrete implementation directly.

#### Scenario: Persisting a new booking

- **WHEN** `create({ userId, title, startTime, endTime })` is called with valid values
- **THEN** a `Booking` row is inserted for that user and the created `Booking` record (including its generated `id`) is returned

#### Scenario: Created booking is readable afterward

- **WHEN** a booking is created and then `findByUserAndDate(userId, startTime)` is called for the same UTC calendar day
- **THEN** the newly created booking is included in the returned results
