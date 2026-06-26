import { ApiProperty } from '@nestjs/swagger';

export class CalendarConnectionResponseDto {
  @ApiProperty({
    example: 'Your Google Calendar has been connected successfully.',
    description: 'Human-readable confirmation message.',
  })
  public readonly message: string;

  @ApiProperty({
    example: true,
    description: 'Whether the calendar is now connected.',
  })
  public readonly calendarConnected: boolean;

  private constructor({
    message,
    calendarConnected,
  }: {
    message: string;
    calendarConnected: boolean;
  }) {
    this.message = message;
    this.calendarConnected = calendarConnected;
  }

  static connected(): CalendarConnectionResponseDto {
    return new CalendarConnectionResponseDto({
      message: 'Your Google Calendar has been connected successfully.',
      calendarConnected: true,
    });
  }
}
