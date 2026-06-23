import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { UserResponseDto } from '../src/auth/dto/user-response.dto';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../src/auth/interfaces/authenticated-user.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../src/auth/interfaces/user-repository.interface';
import { User } from '@prisma/client';

/**
 * Hermetic e2e for GET /auth/sync. The Google token validation and the
 * database are replaced with fakes: the guard mimics bearer-token presence,
 * and the repository is an in-memory idempotent store.
 */
const PRINCIPAL: AuthenticatedUser = {
  googleId: 'google-sub-123',
  email: 'user@example.com',
  name: 'Ada Lovelace',
};

class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private seq = 0;

  upsert(principal: AuthenticatedUser): Promise<User> {
    const existing = this.users.get(principal.googleId);
    const user: User = existing
      ? { ...existing, email: principal.email, name: principal.name ?? null }
      : {
          id: `uuid-${++this.seq}`,
          googleId: principal.googleId,
          email: principal.email,
          name: principal.name ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
    this.users.set(principal.googleId, user);
    return Promise.resolve(user);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return Promise.resolve(this.users.get(googleId) ?? null);
  }

  size(): number {
    return this.users.size;
  }
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let repository: InMemoryUserRepository;

  beforeAll(async () => {
    repository = new InMemoryUserRepository();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: USER_REPOSITORY, useValue: repository }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<Request>();
          const auth = req.headers.authorization;
          if (!auth?.startsWith('Bearer ')) {
            throw new UnauthorizedException();
          }
          req.user = PRINCIPAL;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects GET /auth/sync without a bearer token (401)', () => {
    return request(app.getHttpServer()).get('/auth/sync').expect(401);
  });

  it('creates the user on first sync', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/sync')
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    const body = res.body as UserResponseDto;
    expect(typeof body.id).toBe('string');
    expect(body.email).toBe(PRINCIPAL.email);
    expect(body.name).toBe(PRINCIPAL.name);
    // The persisted model's internal fields must not leak through the DTO.
    expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name']);
    expect(repository.size()).toBe(1);
  });

  it('is idempotent on a second sync (updates, no duplicate)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/sync')
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    const body = res.body as UserResponseDto;
    expect(body.email).toBe(PRINCIPAL.email);
    // Still exactly one record for this Google account.
    expect(repository.size()).toBe(1);
  });
});
