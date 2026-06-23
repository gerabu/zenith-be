import { User } from '@prisma/client';
import { TimeSlot } from '../../availability/domain/time-slot.vo';

export const CALENDAR_PROVIDER = Symbol('ICalendarProvider');

export interface ICalendarProvider {
  getEventsForDate(user: User, date: Date): Promise<TimeSlot[]>;
}
