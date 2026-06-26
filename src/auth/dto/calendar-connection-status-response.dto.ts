import { ApiProperty } from '@nestjs/swagger';

export class CalendarConnectionStatusResponseDto {
  @ApiProperty({
    example: true,
    description: "Whether the user's Google Calendar is currently connected.",
  })
  public readonly calendarConnected: boolean;

  private constructor(calendarConnected: boolean) {
    this.calendarConnected = calendarConnected;
  }

  static from(connected: boolean): CalendarConnectionStatusResponseDto {
    return new CalendarConnectionStatusResponseDto(connected);
  }
}
