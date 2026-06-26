import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponse,
} from '../common/decorators/api-envelope-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarConnectionResponseDto } from './dto/calendar-connection-response.dto';
import { CalendarConnectionStatusResponseDto } from './dto/calendar-connection-status-response.dto';
import { ConnectCalendarDto } from './dto/connect-calendar.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  // Idempotent upsert from token claims; the FE calls this once after login.
  @Get('sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Sync the authenticated user',
    description:
      'Idempotently upserts the user from the verified token claims. The frontend calls this once after login.',
  })
  @ApiEnvelopeResponse(UserResponseDto, {
    status: 200,
    description: 'The synced user.',
  })
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
  async sync(
    @CurrentUser() principal: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.upsert(principal);
    return UserResponseDto.fromUser(user);
  }

  @Get('calendar-connection')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get calendar connection status',
    description:
      "Reports whether the user's Google Calendar is currently connected.",
  })
  @ApiEnvelopeResponse(CalendarConnectionStatusResponseDto, {
    status: 200,
    description: 'Current connection status.',
  })
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
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
  @ApiOperation({
    summary: 'Connect the Google Calendar',
    description:
      'Stores the OAuth tokens needed to read the user’s Google Calendar.',
  })
  @ApiEnvelopeResponse(CalendarConnectionResponseDto, {
    status: 200,
    description: 'Calendar connected.',
  })
  @ApiErrorResponse(
    400,
    'Invalid request body.',
    'accessToken should not be empty',
  )
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
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
