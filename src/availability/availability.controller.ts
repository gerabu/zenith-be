import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponse,
} from '../common/decorators/api-envelope-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AvailabilityService } from './availability.service';
import { TimelineBlockResponseDto } from './dto/timeline-block-response.dto';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':date')
  @ApiOperation({
    summary: 'Get the availability timeline for a day',
    description:
      'Returns the day split into contiguous blocks marked available, booked, or external (from the connected Google Calendar).',
  })
  @ApiParam({
    name: 'date',
    example: '2026-06-25',
    description: 'Target day in YYYY-MM-DD format.',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    example: 'America/Santiago',
    description: 'IANA timezone defining the day window. Defaults to UTC.',
  })
  @ApiEnvelopeResponse(TimelineBlockResponseDto, {
    status: 200,
    description: 'The ordered timeline blocks for the day.',
    isArray: true,
  })
  @ApiErrorResponse(
    400,
    'Invalid date format.',
    'date must be a valid ISO date in YYYY-MM-DD format',
  )
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
  @ApiErrorResponse(
    404,
    'User not found; call /auth/sync first.',
    'User not found; call /auth/sync first',
  )
  async getAvailability(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('date') date: string,
    @Query('tz') tz?: string,
  ): Promise<TimelineBlockResponseDto[]> {
    const timeline = await this.availabilityService.getTimeline(
      principal.googleId,
      date,
      tz,
    );
    return timeline.map((block) => TimelineBlockResponseDto.fromDomain(block));
  }
}
