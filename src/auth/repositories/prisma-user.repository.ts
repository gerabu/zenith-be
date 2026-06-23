import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { IUserRepository } from '../interfaces/user-repository.interface';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(principal: AuthenticatedUser): Promise<User> {
    const { googleId, email, name } = principal;
    return this.prisma.user.upsert({
      where: { googleId },
      create: { googleId, email, name },
      update: { email, name },
    });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }
}
