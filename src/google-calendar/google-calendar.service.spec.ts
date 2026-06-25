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
  const window = {
    start: new Date('2026-06-23T00:00:00.000Z'),
    end: new Date('2026-06-24T00:00:00.000Z'),
  };

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
      const result = await service.getEventsForDate(user, window);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });

    it('returns [] when googleAccessToken is null', async () => {
      const user = makeUser({ googleAccessToken: null });
      const result = await service.getEventsForDate(user, window);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });

    it('returns [] when googleRefreshToken is null', async () => {
      const user = makeUser({ googleRefreshToken: null });
      const result = await service.getEventsForDate(user, window);
      expect(result).toEqual([]);
      expect(mockCalendar).not.toHaveBeenCalled();
    });
  });

  describe('event → CalendarEvent mapping', () => {
    it('maps a valid timed event to a slot and carries its summary as title', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              summary: 'Team sync',
              start: { dateTime: '2026-06-23T09:00:00Z' },
              end: { dateTime: '2026-06-23T09:30:00Z' },
            },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), window);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Team sync');
      expect(result[0].slot.toPrimitives().start.toISOString()).toBe(
        '2026-06-23T09:00:00.000Z',
      );
    });

    it('falls back to an empty title when the event has no summary', async () => {
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
      const result = await service.getEventsForDate(makeUser(), window);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('');
    });

    it('skips all-day events (no dateTime, only date)', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            { start: { date: '2026-06-23' }, end: { date: '2026-06-24' } },
          ],
        },
      });
      const result = await service.getEventsForDate(makeUser(), window);
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
      const result = await service.getEventsForDate(makeUser(), window);
      expect(result).toHaveLength(0);
    });

    it('returns [] when the day has no events', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });
      const result = await service.getEventsForDate(makeUser(), window);
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
      const result = await service.getEventsForDate(makeUser(), window);
      expect(result).toHaveLength(1);
    });
  });

  describe('date window bounds', () => {
    it('passes the given window verbatim as timeMin/timeMax', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });

      await service.getEventsForDate(makeUser(), window);

      expect(mockEventsList).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: window.start.toISOString(),
        timeMax: window.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('uses the window unchanged regardless of the server local timezone', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });
      const tzWindow = {
        start: new Date('2026-06-25T04:00:00.000Z'),
        end: new Date('2026-06-26T04:00:00.000Z'),
      };

      await service.getEventsForDate(makeUser(), tzWindow);

      expect(mockEventsList).toHaveBeenCalledWith(
        expect.objectContaining({
          timeMin: '2026-06-25T04:00:00.000Z',
          timeMax: '2026-06-26T04:00:00.000Z',
        }),
      );
    });

    it('uses calendarId primary', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } });

      await service.getEventsForDate(makeUser(), window);

      expect(mockEventsList).toHaveBeenCalledWith(
        expect.objectContaining({ calendarId: 'primary' }),
      );
    });
  });

  describe('API failure handling', () => {
    it('returns [] when the Google API throws', async () => {
      mockEventsList.mockRejectedValue(new Error('Token revoked'));
      const result = await service.getEventsForDate(makeUser(), window);
      expect(result).toEqual([]);
    });
  });
});
