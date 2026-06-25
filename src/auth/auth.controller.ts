import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarConnectionResponseDto } from './dto/calendar-connection-response.dto';
import { CalendarConnectionStatusResponseDto } from './dto/calendar-connection-status-response.dto';
import { ConnectCalendarDto } from './dto/connect-calendar.dto';
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

  @Get('calendar-connection')
  @UseGuards(JwtAuthGuard)
  async getCalendarConnection(
    @CurrentUser() principal: AuthenticatedUser,
  ): Promise<CalendarConnectionStatusResponseDto> {
    const user = await this.userRepository.findByGoogleId(principal.googleId);
    return CalendarConnectionStatusResponseDto.from(
      user?.calendarConnected ?? false,
    );
  }

  @Patch('calendar-connection')
  @UseGuards(JwtAuthGuard)
  async connectCalendar(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() dto: ConnectCalendarDto,
  ): Promise<CalendarConnectionResponseDto> {
    await this.userRepository.updateCalendarConnection(principal.googleId, {
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
    });
    return CalendarConnectionResponseDto.connected();
  }
}
