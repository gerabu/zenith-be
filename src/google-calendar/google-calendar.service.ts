import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { calendar_v3, google } from 'googleapis';
import { TimeSlot } from '../availability/domain/time-slot.vo';
import { DayWindow } from '../common/timezone/day-window';
import { ICalendarProvider } from './interfaces/calendar-provider.interface';

@Injectable()
export class GoogleCalendarService implements ICalendarProvider {
  constructor(private readonly config: ConfigService) {}

  async getEventsForDate(user: User, window: DayWindow): Promise<TimeSlot[]> {
    if (
      !user.calendarConnected ||
      !user.googleAccessToken ||
      !user.googleRefreshToken
    ) {
      return [];
    }

    const oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    let items: calendar_v3.Schema$Event[];
    try {
      const calendarApi = google.calendar({
        version: 'v3',
        auth: oauth2Client,
      });
      const response = await calendarApi.events.list({
        calendarId: 'primary',
        timeMin: window.start.toISOString(),
        timeMax: window.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      items = response.data.items ?? [];
    } catch {
      return [];
    }

    return this.mapEventsToTimeSlots(items);
  }

  private mapEventsToTimeSlots(events: calendar_v3.Schema$Event[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (const event of events) {
      const startStr = event.start?.dateTime;
      const endStr = event.end?.dateTime;
      if (!startStr || !endStr) continue;
      try {
        slots.push(
          new TimeSlot({ start: new Date(startStr), end: new Date(endStr) }),
        );
      } catch {
        // Skip events that violate TimeSlot invariants (zero-length, reversed, >2h).
      }
    }
    return slots;
  }
}
