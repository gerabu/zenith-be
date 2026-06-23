import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { GoogleCalendarService } from './google-calendar.service';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    calendar: jest.fn(),
  },
}));

interface GoogleApisMock {
  google: {
    auth: { OAuth2: jest.Mock };
    calendar: jest.Mock;
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'uuid-1',
    googleId: 'sub-123',
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

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let mockCalendar: jest.Mock;
  let mockEventsList: jest.Mock;
  const date = new Date('2026-06-23T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    const { google: googleMock } =
      jest.requireMock<GoogleApisMock>('googleapis');
    mockCalendar = googleMock.calendar;
    mockEventsList = jest.fn();
    mockCalendar.mockReturnValue({ events: { list: mockEventsList } });

    const config = {
      get: (key: string) =>
        (
          ({
            GOOGLE_CLIENT_ID: 'client-id',
            GOOGLE_CLIENT_SECRET: 'client-secret',
          }) as Record<string, string>
        )[key],
    } as unknown as ConfigService;
    service = new GoogleCalendarService(config);
  });

  describe('short-circuit: no API call', () => {
    it('returns [] when calendarConnected is false', async () => {
      const user = makeUser({ calendarConnected: false });
      const result = await service.getEventsForDate(user, date);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });

    it('returns [] when googleAccessToken is null', async () => {
      const user = makeUser({ googleAccessToken: null });
      const result = await service.getEventsForDate(user, date);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });

    it('returns [] when googleRefreshToken is null', async () => {
      const user = makeUser({ googleRefreshToken: null });
      const result = await service.getEventsForDate(user, date);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });
  });

  describe('event → TimeSlot mapping', () => {
    it('maps a valid timed event to a TimeSlot', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              start: { dateTime: '2026-06-23T09:00:00Z' },
              end: { dateTime: '2026-06-23T09:30:00Z' },
            },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toHaveLength(1);
    });

    it('skips all-day events (no dateTime, only date)', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            { start: { date: '2026-06-23' }, end: { date: '2026-06-24' } },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toHaveLength(0);
    });

    it('skips events that violate TimeSlot invariants (e.g. >2h)', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              start: { dateTime: '2026-06-23T08:00:00Z' },
              end: { dateTime: '2026-06-24T11:00:00Z' },
            },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toHaveLength(0);
    });

    it('returns [] when the day has no events', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toEqual([]);
    });

    it('returns only valid slots when mixed events are present', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              start: { dateTime: '2026-06-23T10:00:00Z' },
              end: { dateTime: '2026-06-23T10:30:00Z' },
            },
            { start: { date: '2026-06-23' }, end: { date: '2026-06-24' } },
            {
              start: { dateTime: '2026-06-23T14:00:00Z' },
              end: { dateTime: '2026-06-24T17:00:00Z' },
            },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toHaveLength(1);
    });
  });

  describe('date window bounds', () => {
    it('queries timeMin as start of day and timeMax as end of day', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });
      const targetDate = new Date('2026-06-23T12:00:00.000Z');
      const expectedTimeMin = new Date(targetDate);
      expectedTimeMin.setHours(0, 0, 0, 0);
      const expectedTimeMax = new Date(targetDate);
      expectedTimeMax.setHours(23, 59, 59, 999);

      await service.getEventsForDate(makeUser(), targetDate);

      expect(mockEventsList).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: expectedTimeMin.toISOString(),
        timeMax: expectedTimeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('uses calendarId primary', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });

      await service.getEventsForDate(makeUser(), date);

      expect(mockEventsList).toHaveBeenCalledWith(
        expect.objectContaining({ calendarId: 'primary' }),
      );
    });
  });

  describe('API failure handling', () => {
    it('returns [] when the Google API throws', async () => {
      mockEventsList.mockRejectedValue(new Error('Token revoked'));
      const result = await service.getEventsForDate(makeUser(), date);
      expect(result).toEqual([]);
    });
  });
});
