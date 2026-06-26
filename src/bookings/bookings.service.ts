import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Booking } from '@prisma/client';
import {
  BusySlot,
  DailyAvailability,
} from '../availability/domain/daily-availability';
import { TimeSlot } from '../availability/domain/time-slot.vo';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { USER_REPOSITORY } from '../auth/interfaces/user-repository.interface';
import type { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { getDayWindow, toDateStringUtc } from '../common/timezone/day-window';
import { CALENDAR_PROVIDER } from '../google-calendar/interfaces/calendar-provider.interface';
import type { ICalendarProvider } from '../google-calendar/interfaces/calendar-provider.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BOOKING_REPOSITORY } from './interfaces/booking-repository.interface';
import type { IBookingRepository } from './interfaces/booking-repository.interface';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

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
    const window = getDayWindow(toDateStringUtc(start));

    const [internalBookings, externalEvents] = await Promise.all([
      this.bookingRepository.findByUserAndDate(user.id, window),
      this.calendarProvider.getEventsForDate(user, window),
    ]);

    const internalSlots = this.toBusySlots(internalBookings);
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

  async delete(principal: AuthenticatedUser, bookingId: string): Promise<void> {
    const user = await this.userRepository.findByGoogleId(principal.googleId);
    if (!user) {
      throw new NotFoundException('User not found; call /auth/sync first');
    }

    const booking = await this.bookingRepository.findById(bookingId);
    // A booking owned by someone else is reported as not found so booking
    // existence is never disclosed to non-owners.
    if (!booking || booking.userId !== user.id) {
      throw new NotFoundException('Booking not found');
    }

    await this.bookingRepository.delete(bookingId);
  }

  private toBusySlots(bookings: Booking[]): BusySlot[] {
    const slots: BusySlot[] = [];
    for (const booking of bookings) {
      try {
        slots.push({
          slot: new TimeSlot({
            start: booking.startTime,
            end: booking.endTime,
          }),
          title: booking.title,
        });
      } catch {
        this.logger.warn(
          `Skipping invalid booking slot: ${booking.startTime.toISOString()} – ${booking.endTime.toISOString()}`,
        );
      }
    }
    return slots;
  }
}
