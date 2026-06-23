import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  // Idempotent upsert from token claims; the FE calls this once after login.
  @Get('sync')
  @UseGuards(JwtAuthGuard)
  async sync(
    @CurrentUser() principal: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.upsert(principal);
    return UserResponseDto.fromUser(user);
  }
}
