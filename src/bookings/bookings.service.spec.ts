import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Booking, User } from '@prisma/client';
import { TimeSlot } from '../availability/domain/time-slot.vo';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { ICalendarProvider } from '../google-calendar/interfaces/calendar-provider.interface';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { IBookingRepository } from './interfaces/booking-repository.interface';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid',
    googleId: 'google-sub-123',
    email: 'user@example.com',
    name: 'Test User',
    calendarConnected: true,
    googleAccessToken: 'access-token',
    googleRefreshToken: 'refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-uuid',
    userId: 'user-uuid',
    title: 'Test Booking',
    startTime: new Date('2026-06-25T10:00:00Z'),
    endTime: new Date('2026-06-25T11:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const principal: AuthenticatedUser = {
  googleId: 'google-sub-123',
  email: 'user@example.com',
};

const validDto: CreateBookingDto = {
  title: 'Team Sync',
  startTime: '2026-06-25T14:00:00Z',
  endTime: '2026-06-25T15:00:00Z',
};

describe('BookingsService', () => {
  let service: BookingsService;
  let findByUserAndDate: jest.Mock;
  let bookingFindById: jest.Mock;
  let bookingCreate: jest.Mock;
  let bookingDelete: jest.Mock;
  let getEventsForDate: jest.Mock;
  let findByGoogleId: jest.Mock;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let calendarProvider: jest.Mocked<ICalendarProvider>;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    findByUserAndDate = jest.fn().mockResolvedValue([]);
    bookingFindById = jest.fn().mockResolvedValue(makeBooking());
    bookingCreate = jest.fn().mockResolvedValue(makeBooking());
    bookingDelete = jest.fn().mockResolvedValue(undefined);
    getEventsForDate = jest.fn().mockResolvedValue([]);
    findByGoogleId = jest.fn().mockResolvedValue(makeUser());

    bookingRepo = {
      findByUserAndDate,
      findById: bookingFindById,
      create: bookingCreate,
      delete: bookingDelete,
    };

    calendarProvider = {
      getEventsForDate,
    };

    userRepo = {
      findByGoogleId,
      upsert: jest.fn(),
    };

    service = new BookingsService(bookingRepo, calendarProvider, userRepo);
  });

  describe('happy path', () => {
    it('persists and returns the Booking when no conflicts exist', async () => {
      const created = makeBooking({ title: 'Team Sync' });
      bookingCreate.mockResolvedValue(created);

      const result = await service.create(principal, validDto);

      expect(bookingCreate).toHaveBeenCalledWith({
        userId: 'user-uuid',
        title: 'Team Sync',
        startTime: new Date('2026-06-25T14:00:00Z'),
        endTime: new Date('2026-06-25T15:00:00Z'),
      });
      expect(result).toBe(created);
    });

    it('fetches bookings and calendar events in parallel for the startTime UTC day', async () => {
      await service.create(principal, validDto);

      const expectedWindow = {
        start: new Date('2026-06-25T00:00:00.000Z'),
        end: new Date('2026-06-26T00:00:00.000Z'),
      };
      expect(findByUserAndDate).toHaveBeenCalledWith(
        'user-uuid',
        expectedWindow,
      );
      expect(getEventsForDate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-uuid' }),
        expectedWindow,
      );
    });
  });

  describe('user not found', () => {
    it('throws NotFoundException when user is not in DB', async () => {
      findByGoogleId.mockResolvedValue(null);

      await expect(service.create(principal, validDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('invalid slot (400)', () => {
    it('throws BadRequestException when endTime equals startTime', async () => {
      const dto = { ...validDto, endTime: validDto.startTime };

      await expect(service.create(principal, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when slot is shorter than 15 minutes', async () => {
      const dto = { ...validDto, endTime: '2026-06-25T14:10:00Z' };

      await expect(service.create(principal, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when endTime is before startTime', async () => {
      const dto = { ...validDto, endTime: '2026-06-25T13:00:00Z' };

      await expect(service.create(principal, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('calendar not connected (403)', () => {
    it('throws ForbiddenException when calendarConnected is false', async () => {
      findByGoogleId.mockResolvedValue(makeUser({ calendarConnected: false }));

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when googleAccessToken is null', async () => {
      findByGoogleId.mockResolvedValue(makeUser({ googleAccessToken: null }));

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when googleRefreshToken is null', async () => {
      findByGoogleId.mockResolvedValue(makeUser({ googleRefreshToken: null }));

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not perform conflict check when calendar is not connected', async () => {
      findByGoogleId.mockResolvedValue(makeUser({ calendarConnected: false }));

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ForbiddenException,
      );

      expect(findByUserAndDate).not.toHaveBeenCalled();
      expect(getEventsForDate).not.toHaveBeenCalled();
    });
  });

  describe('conflict with internal booking (409)', () => {
    it('throws ConflictException when requested slot overlaps an existing booking', async () => {
      findByUserAndDate.mockResolvedValue([
        makeBooking({
          startTime: new Date('2026-06-25T14:30:00Z'),
          endTime: new Date('2026-06-25T15:30:00Z'),
        }),
      ]);

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(bookingCreate).not.toHaveBeenCalled();
    });
  });

  describe('conflict with Google Calendar event (409)', () => {
    it('throws ConflictException when requested slot overlaps an external event', async () => {
      getEventsForDate.mockResolvedValue([
        {
          slot: new TimeSlot({
            start: new Date('2026-06-25T14:45:00Z'),
            end: new Date('2026-06-25T15:45:00Z'),
          }),
          title: 'Team sync',
        },
      ]);

      await expect(service.create(principal, validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(bookingCreate).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a booking the user owns', async () => {
      bookingFindById.mockResolvedValue(makeBooking({ id: 'booking-uuid' }));

      await service.delete(principal, 'booking-uuid');

      expect(bookingDelete).toHaveBeenCalledWith('booking-uuid');
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      bookingFindById.mockResolvedValue(null);

      await expect(service.delete(principal, 'missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(bookingDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the booking belongs to another user', async () => {
      bookingFindById.mockResolvedValue(
        makeBooking({ id: 'booking-uuid', userId: 'someone-else' }),
      );

      await expect(service.delete(principal, 'booking-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(bookingDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the caller has no synced user', async () => {
      findByGoogleId.mockResolvedValue(null);

      await expect(service.delete(principal, 'booking-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(bookingFindById).not.toHaveBeenCalled();
      expect(bookingDelete).not.toHaveBeenCalled();
    });
  });
});
