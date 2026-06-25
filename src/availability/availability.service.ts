import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Booking, User } from '@prisma/client';
import { BOOKING_REPOSITORY } from '../bookings/interfaces/booking-repository.interface';
import type { IBookingRepository } from '../bookings/interfaces/booking-repository.interface';
import { CALENDAR_PROVIDER } from '../google-calendar/interfaces/calendar-provider.interface';
import type {
  CalendarEvent,
  ICalendarProvider,
} from '../google-calendar/interfaces/calendar-provider.interface';
import { USER_REPOSITORY } from '../auth/interfaces/user-repository.interface';
import type { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { DayWindow, getDayWindow } from '../common/timezone/day-window';
import {
  BusySlot,
  DailyAvailability,
  TimelineBlock,
} from './domain/daily-availability';
import { TimeSlot } from './domain/time-slot.vo';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_PROVIDER)
    private readonly calendarProvider: ICalendarProvider,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async getTimeline(
    googleId: string,
    dateStr: string,
    tz?: string,
  ): Promise<TimelineBlock[]> {
    this.assertValidDate(dateStr);

    const user = await this.userRepository.findByGoogleId(googleId);
    if (!user) {
      throw new NotFoundException('User not found; call /auth/sync first');
    }

    // The day is defined in the viewer's timezone (default UTC) and the same
    // window feeds the bookings query, the calendar fetch, and the timeline.
    const window = getDayWindow(dateStr, tz);

    const [bookings, externalSlots] = await Promise.all([
      this.bookingRepository.findByUserAndDate(user.id, window),
      this.fetchCalendarEvents(user, window),
    ]);

    const bookingSlots = this.toBusySlots(bookings);
    const availability = new DailyAvailability(bookingSlots, externalSlots);

    return availability.getTimeline(window.start, window.end);
  }

  private assertValidDate(dateStr: string): void {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(
        'date must be a valid ISO date in YYYY-MM-DD format',
      );
    }
    const parsed = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'date must be a valid ISO date in YYYY-MM-DD format',
      );
    }
  }

  private async fetchCalendarEvents(
    user: User,
    window: DayWindow,
  ): Promise<CalendarEvent[]> {
    try {
      return await this.calendarProvider.getEventsForDate(user, window);
    } catch (err) {
      this.logger.error(
        `Failed to fetch calendar events for user ${user.id}`,
        err instanceof Error ? err.stack : err,
      );
      return [];
    }
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
