import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { BOOKING_REPOSITORY } from '../bookings/interfaces/booking-repository.interface';
import type { IBookingRepository } from '../bookings/interfaces/booking-repository.interface';
import { CALENDAR_PROVIDER } from '../google-calendar/interfaces/calendar-provider.interface';
import type { ICalendarProvider } from '../google-calendar/interfaces/calendar-provider.interface';
import { USER_REPOSITORY } from '../auth/interfaces/user-repository.interface';
import type { IUserRepository } from '../auth/interfaces/user-repository.interface';
import { DailyAvailability, TimelineBlock } from './domain/daily-availability';
import { TimeSlot } from './domain/time-slot.vo';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_PROVIDER) private readonly calendarProvider: ICalendarProvider,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async getTimeline(googleId: string, dateStr: string): Promise<TimelineBlock[]> {
    const date = this.parseDate(dateStr);

    const user = await this.userRepository.findByGoogleId(googleId);
    if (!user) {
      throw new NotFoundException('User not found; call /auth/sync first');
    }

    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

    const [bookings, externalSlots] = await Promise.all([
      this.bookingRepository.findByUserAndDate(user.id, date),
      this.fetchCalendarEvents(user, date),
    ]);

    const bookingSlots = this.toTimeSlots(bookings.map((b) => ({ start: b.startTime, end: b.endTime })));
    const availability = new DailyAvailability(bookingSlots, externalSlots);

    return availability.getTimeline(dayStart, dayEnd);
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be a valid ISO date in YYYY-MM-DD format');
    }
    const parsed = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException('date must be a valid ISO date in YYYY-MM-DD format');
    }
    return parsed;
  }

  private async fetchCalendarEvents(user: User, date: Date): Promise<TimeSlot[]> {
    try {
      return await this.calendarProvider.getEventsForDate(user, date);
    } catch (err) {
      this.logger.error(`Failed to fetch calendar events for user ${user.id}`, err instanceof Error ? err.stack : err);
      return [];
    }
  }

  private toTimeSlots(ranges: { start: Date; end: Date }[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (const range of ranges) {
      try {
        slots.push(new TimeSlot({ start: range.start, end: range.end }));
      } catch {
        this.logger.warn(`Skipping invalid booking slot: ${range.start.toISOString()} – ${range.end.toISOString()}`);
      }
    }
    return slots;
  }
}
