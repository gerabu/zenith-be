import { Injectable } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBookingInput,
  IBookingRepository,
} from '../interfaces/booking-repository.interface';

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndDate(userId: string, date: Date): Promise<Booking[]> {
    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const dayEnd = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
      ),
    );

    return this.prisma.booking.findMany({
      where: {
        userId,
        startTime: { gte: dayStart, lt: dayEnd },
      },
    });
  }

  create(input: CreateBookingInput): Promise<Booking> {
    return this.prisma.booking.create({ data: input });
  }
}
