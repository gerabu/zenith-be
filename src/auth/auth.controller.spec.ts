// jwks-rsa transitively imports the ESM-only `jose` package — stub it out
// so the CJS test transform doesn't choke on the ESM syntax.
jest.mock('jwks-rsa', () => ({ passportJwtSecret: () => () => undefined }));

import { User } from '@prisma/client';
import { AuthController } from './auth.controller';
import { CalendarConnectionResponseDto } from './dto/calendar-connection-response.dto';
import { CalendarConnectionStatusResponseDto } from './dto/calendar-connection-status-response.dto';
import { ConnectCalendarDto } from './dto/connect-calendar.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { IUserRepository } from './interfaces/user-repository.interface';

const baseUser: User = {
  id: 'uuid-1',
  googleId: 'google-sub-123',
  email: 'user@example.com',
  name: 'Ada Lovelace',
  calendarConnected: false,
  googleAccessToken: null,
  googleRefreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const principal: AuthenticatedUser = {
  googleId: baseUser.googleId,
  email: baseUser.email,
  name: baseUser.name ?? undefined,
};

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    upsert: jest.fn(),
    findByGoogleId: jest.fn(),
    updateCalendarConnection: jest.fn(),
    ...overrides,
  };
}

describe('AuthController', () => {
  describe('sync', () => {
    it('upserts and returns a UserResponseDto without exposing internal fields', async () => {
      const upsertMock = jest.fn().mockResolvedValue(baseUser);
      const repo = makeRepo({ upsert: upsertMock });
      const controller = new AuthController(repo);

      const result = await controller.sync(principal);

      expect(upsertMock).toHaveBeenCalledWith(principal);
      expect(result.id).toBe(baseUser.id);
      expect(result.email).toBe(baseUser.email);
      expect(
        (result as Record<string, unknown>).googleAccessToken,
      ).toBeUndefined();
    });
  });

  describe('getCalendarConnection', () => {
    it('returns calendarConnected true for a user whose connection is persisted', async () => {
      const findMock = jest
        .fn()
        .mockResolvedValue({ ...baseUser, calendarConnected: true });
      const repo = makeRepo({ findByGoogleId: findMock });
      const controller = new AuthController(repo);

      const result = await controller.getCalendarConnection(principal);

      expect(findMock).toHaveBeenCalledWith(principal.googleId);
      expect(result).toBeInstanceOf(CalendarConnectionStatusResponseDto);
      expect(result.calendarConnected).toBe(true);
    });

    it('returns calendarConnected false for a user with no persisted connection', async () => {
      const findMock = jest
        .fn()
        .mockResolvedValue({ ...baseUser, calendarConnected: false });
      const repo = makeRepo({ findByGoogleId: findMock });
      const controller = new AuthController(repo);

      const result = await controller.getCalendarConnection(principal);

      expect(result.calendarConnected).toBe(false);
    });

    it('returns calendarConnected false when the user has no record', async () => {
      const findMock = jest.fn().mockResolvedValue(null);
      const repo = makeRepo({ findByGoogleId: findMock });
      const controller = new AuthController(repo);

      const result = await controller.getCalendarConnection(principal);

      expect(result.calendarConnected).toBe(false);
    });

    it('performs no write and exposes only calendarConnected', async () => {
      const findMock = jest
        .fn()
        .mockResolvedValue({ ...baseUser, calendarConnected: true });
      const upsertMock = jest.fn();
      const updateMock = jest.fn();
      const repo = makeRepo({
        findByGoogleId: findMock,
        upsert: upsertMock,
        updateCalendarConnection: updateMock,
      });
      const controller = new AuthController(repo);

      const result = await controller.getCalendarConnection(principal);

      expect(upsertMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
      expect(Object.keys({ ...result })).toEqual(['calendarConnected']);
      expect((result as Record<string, unknown>).message).toBeUndefined();
      expect((result as Record<string, unknown>).accessToken).toBeUndefined();
      expect((result as Record<string, unknown>).refreshToken).toBeUndefined();
    });
  });

  describe('connectCalendar', () => {
    it('delegates to updateCalendarConnection with the principal googleId and returns the response DTO', async () => {
      const updateMock = jest
        .fn()
        .mockResolvedValue({ ...baseUser, calendarConnected: true });
      const repo = makeRepo({ updateCalendarConnection: updateMock });
      const controller = new AuthController(repo);

      const dto: ConnectCalendarDto = {
        accessToken: 'at-tok',
        refreshToken: 'rt-tok',
      };
      const result = await controller.connectCalendar(principal, dto);

      expect(updateMock).toHaveBeenCalledWith(principal.googleId, {
        accessToken: 'at-tok',
        refreshToken: 'rt-tok',
      });
      expect(result).toBeInstanceOf(CalendarConnectionResponseDto);
      expect(result.calendarConnected).toBe(true);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
      expect((result as Record<string, unknown>).accessToken).toBeUndefined();
      expect((result as Record<string, unknown>).refreshToken).toBeUndefined();
    });

    it('passes undefined refreshToken when not supplied in the DTO', async () => {
      const updateMock = jest
        .fn()
        .mockResolvedValue({ ...baseUser, calendarConnected: true });
      const repo = makeRepo({ updateCalendarConnection: updateMock });
      const controller = new AuthController(repo);

      const dto: ConnectCalendarDto = { accessToken: 'at-only' };
      await controller.connectCalendar(principal, dto);

      expect(updateMock).toHaveBeenCalledWith(principal.googleId, {
        accessToken: 'at-only',
        refreshToken: undefined,
      });
    });
  });
});
