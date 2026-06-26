import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiEnvelopeResponse,
  ApiErrorResponse,
} from '../common/decorators/api-envelope-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a booking',
    description:
      'Books a named time slot. Rejected if it overlaps an existing booking or an event in the user’s Google Calendar.',
  })
  @ApiEnvelopeResponse(BookingResponseDto, {
    status: 201,
    description: 'The created booking.',
  })
  @ApiErrorResponse(
    400,
    'Invalid request body or time range.',
    'startTime must be a valid ISO 8601 date string',
  )
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Google Calendar not connected.',
    'Google Calendar must be connected before creating a booking. Please connect your calendar to continue.',
  )
  @ApiErrorResponse(
    404,
    'User not found; call /auth/sync first.',
    'User not found; call /auth/sync first',
  )
  @ApiErrorResponse(
    409,
    'Booking overlaps an existing booking or calendar event.',
    'The requested time slot conflicts with an existing booking or calendar event.',
  )
  async create(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.create(principal, dto);
    return BookingResponseDto.fromBooking(booking);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a booking',
    description:
      'Deletes a booking owned by the authenticated user. Bookings owned by others are reported as not found.',
  })
  @ApiResponse({ status: 204, description: 'Booking deleted; no content.' })
  @ApiErrorResponse(401, 'Missing or invalid bearer token.', 'Unauthorized')
  @ApiErrorResponse(
    404,
    'Booking not found, or user not synced.',
    'Booking not found',
  )
  async remove(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.bookingsService.delete(principal, id);
  }
}
