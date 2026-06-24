import { Module } from '@nestjs/common';
import { BOOKING_REPOSITORY } from './interfaces/booking-repository.interface';
import { PrismaBookingRepository } from './repositories/prisma-booking.repository';

@Module({
  providers: [{ provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository }],
  exports: [BOOKING_REPOSITORY],
})
export class BookingsModule {}
