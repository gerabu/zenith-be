import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { CALENDAR_PROVIDER } from './interfaces/calendar-provider.interface';

@Module({
  providers: [
    { provide: CALENDAR_PROVIDER, useClass: GoogleCalendarService },
    GoogleCalendarService,
  ],
  exports: [CALENDAR_PROVIDER],
})
export class GoogleCalendarModule {}
