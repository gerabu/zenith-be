import { Booking } from '@prisma/client';

export const BOOKING_REPOSITORY = Symbol('IBookingRepository');

export interface IBookingRepository {
  findByUserAndDate(userId: string, date: Date): Promise<Booking[]>;
}
