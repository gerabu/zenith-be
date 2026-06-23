import { User } from '@prisma/client';
import { AuthenticatedUser } from './authenticated-user.interface';

// Interfaces have no runtime value, so injection goes through this token.
export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  // Idempotent create-or-update keyed on googleId; refreshes email/name.
  upsert(principal: AuthenticatedUser): Promise<User>;

  findByGoogleId(googleId: string): Promise<User | null>;
}
