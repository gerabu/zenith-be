import { Booking } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaBookingRepository } from './prisma-booking.repository';

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

describe('PrismaBookingRepository', () => {
  let findManyMock: jest.Mock;
  let findUniqueMock: jest.Mock;
  let createMock: jest.Mock;
  let deleteMock: jest.Mock;
  let repository: PrismaBookingRepository;

  beforeEach(() => {
    findManyMock = jest.fn();
    findUniqueMock = jest.fn();
    createMock = jest.fn();
    deleteMock = jest.fn();
    const prisma = {
      booking: {
        findMany: findManyMock,
        findUnique: findUniqueMock,
        create: createMock,
        delete: deleteMock,
      },
    } as unknown as PrismaService;
    repository = new PrismaBookingRepository(prisma);
  });

  describe('findByUserAndDate', () => {
    const userId = 'user-uuid';
    const window = {
      start: new Date('2026-06-25T00:00:00.000Z'),
      end: new Date('2026-06-26T00:00:00.000Z'),
    };

    it('queries within the provided window boundaries', async () => {
      findManyMock.mockResolvedValue([]);

      await repository.findByUserAndDate(userId, window);

      expect(findManyMock).toHaveBeenCalledWith({
        where: {
          userId,
          startTime: { gte: window.start, lt: window.end },
        },
      });
    });

    it('passes a timezone-shifted window through verbatim', async () => {
      findManyMock.mockResolvedValue([]);
      const tzWindow = {
        start: new Date('2026-06-25T04:00:00.000Z'),
        end: new Date('2026-06-26T04:00:00.000Z'),
      };

      await repository.findByUserAndDate(userId, tzWindow);

      expect(findManyMock).toHaveBeenCalledWith({
        where: {
          userId,
          startTime: { gte: tzWindow.start, lt: tzWindow.end },
        },
      });
    });

    it('returns bookings that fall within the day', async () => {
      const booking = makeBooking();
      findManyMock.mockResolvedValue([booking]);

      const result = await repository.findByUserAndDate(userId, window);

      expect(result).toEqual([booking]);
    });

    it('returns empty array when user has no bookings on the day', async () => {
      findManyMock.mockResolvedValue([]);

      const result = await repository.findByUserAndDate(userId, window);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const input = {
      userId: 'user-uuid',
      title: 'Team Sync',
      startTime: new Date('2026-06-25T14:00:00Z'),
      endTime: new Date('2026-06-25T15:00:00Z'),
    };

    it('calls prisma.booking.create with the provided input', async () => {
      const created = makeBooking({ title: 'Team Sync' });
      createMock.mockResolvedValue(created);

      await repository.create(input);

      expect(createMock).toHaveBeenCalledWith({ data: input });
    });

    it('returns the created booking record including generated id', async () => {
      const created = makeBooking({ id: 'generated-uuid', title: 'Team Sync' });
      createMock.mockResolvedValue(created);

      const result = await repository.create(input);

      expect(result.id).toBe('generated-uuid');
      expect(result).toEqual(created);
    });
  });

  describe('findById', () => {
    it('queries prisma.booking.findUnique by id', async () => {
      const booking = makeBooking();
      findUniqueMock.mockResolvedValue(booking);

      const result = await repository.findById('booking-uuid');

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 'booking-uuid' },
      });
      expect(result).toEqual(booking);
    });

    it('returns null when no booking matches the id', async () => {
      findUniqueMock.mockResolvedValue(null);

      const result = await repository.findById('missing-uuid');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('calls prisma.booking.delete with the provided id', async () => {
      deleteMock.mockResolvedValue(makeBooking());

      await repository.delete('booking-uuid');

      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: 'booking-uuid' },
      });
    });
  });
});
