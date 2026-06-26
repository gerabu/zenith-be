import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Booking, User } from '@prisma/client';
import { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { ICalendarProvider } from '../google-calendar/interfaces/calendar-provider.interface';
import { IBookingRepository } from '../bookings/interfaces/booking-repository.interface';
import { TimeSlot } from './domain/time-slot.vo';
import { AvailabilityService } from './availability.service';

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
    title: 'Booking',
    startTime: new Date('2026-06-25T09:00:00.000Z'),
    endTime: new Date('2026-06-25T10:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let findByUserAndDate: jest.Mock;
  let getEventsForDate: jest.Mock;
  let findByGoogleId: jest.Mock;

  beforeEach(() => {
    findByUserAndDate = jest.fn().mockResolvedValue([] as Booking[]);
    getEventsForDate = jest.fn().mockResolvedValue([]);
    findByGoogleId = jest.fn().mockResolvedValue(makeUser());

    const bookingRepo = {
      findByUserAndDate,
      create: jest.fn(),
    } as jest.Mocked<IBookingRepository>;
    const calendarProvider = {
      getEventsForDate,
    } as jest.Mocked<ICalendarProvider>;
    const userRepo = {
      findByGoogleId,
      upsert: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    service = new AvailabilityService(bookingRepo, calendarProvider, userRepo);
  });

  it('uses a midnight-UTC window when no timezone is provided', async () => {
    await service.getTimeline('google-sub-123', '2026-06-25');

    const expectedWindow = {
      start: new Date('2026-06-25T00:00:00.000Z'),
      end: new Date('2026-06-26T00:00:00.000Z'),
    };
    expect(findByUserAndDate).toHaveBeenCalledWith('user-uuid', expectedWindow);
    expect(getEventsForDate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-uuid' }),
      expectedWindow,
    );
  });

  it('resolves the window in the provided timezone', async () => {
    await service.getTimeline(
      'google-sub-123',
      '2026-06-25',
      'America/New_York',
    );

    const expectedWindow = {
      start: new Date('2026-06-25T04:00:00.000Z'),
      end: new Date('2026-06-26T04:00:00.000Z'),
    };
    expect(findByUserAndDate).toHaveBeenCalledWith('user-uuid', expectedWindow);
    expect(getEventsForDate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-uuid' }),
      expectedWindow,
    );
  });

  it('falls back to UTC for an invalid timezone', async () => {
    await service.getTimeline('google-sub-123', '2026-06-25', 'Not/AZone');

    const expectedWindow = {
      start: new Date('2026-06-25T00:00:00.000Z'),
      end: new Date('2026-06-26T00:00:00.000Z'),
    };
    expect(findByUserAndDate).toHaveBeenCalledWith('user-uuid', expectedWindow);
  });

  it('rejects a malformed date with BadRequestException', async () => {
    await expect(
      service.getTimeline('google-sub-123', 'not-a-date'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when the user is not found', async () => {
    findByGoogleId.mockResolvedValue(null);

    await expect(
      service.getTimeline('google-sub-123', '2026-06-25'),
    ).rejects.toThrow(NotFoundException);
  });

  it('surfaces booking titles and calendar event titles on busy blocks', async () => {
    findByUserAndDate.mockResolvedValue([
      makeBooking({
        title: 'Dentist',
        startTime: new Date('2026-06-25T09:00:00.000Z'),
        endTime: new Date('2026-06-25T10:00:00.000Z'),
      }),
    ]);
    getEventsForDate.mockResolvedValue([
      {
        slot: new TimeSlot({
          start: new Date('2026-06-25T14:00:00.000Z'),
          end: new Date('2026-06-25T15:00:00.000Z'),
        }),
        title: 'Team sync',
      },
    ]);

    const timeline = await service.getTimeline('google-sub-123', '2026-06-25');

    const booked = timeline.find((b) => b.status === 'booked');
    const external = timeline.find((b) => b.status === 'external');
    expect(booked?.title).toBe('Dentist');
    expect(external?.title).toBe('Team sync');
    expect(
      timeline
        .filter((b) => b.status === 'available')
        .every((b) => !Object.prototype.hasOwnProperty.call(b, 'title')),
    ).toBe(true);
  });

  it('emits an empty title for a booking with no title', async () => {
    findByUserAndDate.mockResolvedValue([
      makeBooking({
        title: '',
        startTime: new Date('2026-06-25T09:00:00.000Z'),
        endTime: new Date('2026-06-25T10:00:00.000Z'),
      }),
    ]);

    const timeline = await service.getTimeline('google-sub-123', '2026-06-25');

    const booked = timeline.find((b) => b.status === 'booked');
    expect(booked).toBeDefined();
    expect(booked?.title).toBe('');
  });

  it('exposes the internal booking id on booked blocks only', async () => {
    findByUserAndDate.mockResolvedValue([
      makeBooking({
        id: 'booking-uuid',
        startTime: new Date('2026-06-25T09:00:00.000Z'),
        endTime: new Date('2026-06-25T10:00:00.000Z'),
      }),
    ]);
    getEventsForDate.mockResolvedValue([
      {
        slot: new TimeSlot({
          start: new Date('2026-06-25T14:00:00.000Z'),
          end: new Date('2026-06-25T15:00:00.000Z'),
        }),
        title: 'Team sync',
      },
    ]);

    const timeline = await service.getTimeline('google-sub-123', '2026-06-25');

    expect(timeline.find((b) => b.status === 'booked')?.id).toBe(
      'booking-uuid',
    );
    expect(timeline.find((b) => b.status === 'external')?.id).toBeUndefined();
    expect(
      timeline
        .filter((b) => b.status === 'available')
        .every((b) => b.id === undefined),
    ).toBe(true);
  });
});
