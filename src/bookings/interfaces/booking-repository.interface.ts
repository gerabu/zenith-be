import { Booking } from '@prisma/client';
import { DayWindow } from '../../common/timezone/day-window';

export const BOOKING_REPOSITORY = Symbol('IBookingRepository');

export interface CreateBookingInput {
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface IBookingRepository {
  findByUserAndDate(userId: string, window: DayWindow): Promise<Booking[]>;
  findById(id: string): Promise<Booking | null>;
  create(input: CreateBookingInput): Promise<Booking>;
  delete(id: string): Promise<void>;
}
