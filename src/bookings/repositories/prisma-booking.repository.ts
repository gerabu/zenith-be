import { Injectable } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { DayWindow } from '../../common/timezone/day-window';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBookingInput,
  IBookingRepository,
} from '../interfaces/booking-repository.interface';

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndDate(userId: string, window: DayWindow): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: {
        userId,
        startTime: { gte: window.start, lt: window.end },
      },
    });
  }

  findById(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({ where: { id } });
  }

  create(input: CreateBookingInput): Promise<Booking> {
    return this.prisma.booking.create({ data: input });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.booking.delete({ where: { id } });
  }
}
