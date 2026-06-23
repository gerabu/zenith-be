import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository', () => {
  const principal: AuthenticatedUser = {
    googleId: 'google-sub-123',
    email: 'user@example.com',
    name: 'Ada Lovelace',
  };

  const baseUser: User = {
    id: 'uuid-1',
    googleId: principal.googleId,
    email: principal.email,
    name: principal.name ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let upsertMock: jest.Mock;
  let repository: PrismaUserRepository;

  beforeEach(() => {
    upsertMock = jest.fn();
    const prisma = { user: { upsert: upsertMock } } as unknown as PrismaService;
    repository = new PrismaUserRepository(prisma);
  });

  it('upserts keyed on googleId, creating with full claims and updating mutable fields', async () => {
    upsertMock.mockResolvedValue(baseUser);

    await repository.upsert(principal);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { googleId: principal.googleId },
      create: {
        googleId: principal.googleId,
        email: principal.email,
        name: principal.name,
      },
      update: { email: principal.email, name: principal.name },
    });
  });

  it('is idempotent: a second sync updates rather than duplicates', async () => {
    upsertMock.mockResolvedValueOnce(baseUser);
    const updated: User = { ...baseUser, email: 'new@example.com' };
    upsertMock.mockResolvedValueOnce(updated);

    const first = await repository.upsert(principal);
    const second = await repository.upsert({
      ...principal,
      email: 'new@example.com',
    });

    // Same row (same id) both times — no duplicate created.
    expect(first.id).toBe(second.id);
    expect(second.email).toBe('new@example.com');
    expect(upsertMock).toHaveBeenCalledTimes(2);
    // Every call is keyed on the stable googleId.
    const calls = upsertMock.mock.calls as Array<[{ where: unknown }]>;
    for (const [arg] of calls) {
      expect(arg.where).toEqual({ googleId: principal.googleId });
    }
  });
});
