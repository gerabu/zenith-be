import { User } from '@prisma/client';
import { DayWindow } from '../../common/timezone/day-window';
import { TimeSlot } from '../../availability/domain/time-slot.vo';

export const CALENDAR_PROVIDER = Symbol('ICalendarProvider');

export interface ICalendarProvider {
  getEventsForDate(user: User, window: DayWindow): Promise<TimeSlot[]>;
}
