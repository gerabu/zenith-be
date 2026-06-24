import { Booking } from '@prisma/client';

export const BOOKING_REPOSITORY = Symbol('IBookingRepository');

export interface CreateBookingInput {
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface IBookingRepository {
  findByUserAndDate(userId: string, date: Date): Promise<Booking[]>;
  create(input: CreateBookingInput): Promise<Booking>;
}
