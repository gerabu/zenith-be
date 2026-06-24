import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BOOKING_REPOSITORY } from './interfaces/booking-repository.interface';
import { PrismaBookingRepository } from './repositories/prisma-booking.repository';

@Module({
  imports: [AuthModule, GoogleCalendarModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
  ],
  exports: [BOOKING_REPOSITORY],
})
export class BookingsModule {}
