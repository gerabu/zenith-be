import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { GoogleJwtStrategy } from './strategies/google-jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    GoogleJwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class AuthModule {}
