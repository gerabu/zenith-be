import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking } from '@prisma/client';
import { DailyAvailability } from '../availability/domain/daily-availability';
import { TimeSlot } from '../availability/domain/time-slot.vo';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { USER_REPOSITORY } from '../auth/interfaces/user-repository.interface';
import type { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { CALENDAR_PROVIDER } from '../google-calendar/interfaces/calendar-provider.interface';
import type { ICalendarProvider } from '../google-calendar/interfaces/calendar-provider.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BOOKING_REPOSITORY } from './interfaces/booking-repository.interface';
import type { IBookingRepository } from './interfaces/booking-repository.interface';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_PROVIDER)
    private readonly calendarProvider: ICalendarProvider,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async create(
    principal: AuthenticatedUser,
    dto: CreateBookingDto,
  ): Promise<Booking> {
    const user = await this.userRepository.findByGoogleId(principal.googleId);
    if (!user) {
      throw new NotFoundException('User not found; call /auth/sync first');
    }

    let requestedSlot: TimeSlot;
    try {
      requestedSlot = new TimeSlot({
        start: new Date(dto.startTime),
        end: new Date(dto.endTime),
      });
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid time slot',
      );
    }

    if (
      !user.calendarConnected ||
      !user.googleAccessToken ||
      !user.googleRefreshToken
    ) {
      throw new ForbiddenException(
        'Google Calendar must be connected before creating a booking. Please connect your calendar to continue.',
      );
    }

    const { start } = requestedSlot.toPrimitives();
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    );

    const [internalBookings, externalEvents] = await Promise.all([
      this.bookingRepository.findByUserAndDate(user.id, date),
      this.calendarProvider.getEventsForDate(user, date),
    ]);

    const internalSlots = internalBookings.map(
      (b) => new TimeSlot({ start: b.startTime, end: b.endTime }),
    );
    const availability = new DailyAvailability(internalSlots, externalEvents);

    if (!availability.canBook(requestedSlot)) {
      throw new ConflictException(
        'The requested time slot conflicts with an existing booking or calendar event.',
      );
    }

    return this.bookingRepository.create({
      userId: user.id,
      title: dto.title,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
    });
  }
}
