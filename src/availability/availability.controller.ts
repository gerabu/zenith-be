import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AvailabilityService } from './availability.service';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':date')
  getAvailability(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('date') date: string,
    @Query('tz') tz?: string,
  ) {
    return this.availabilityService.getTimeline(principal.googleId, date, tz);
  }
}
